import express from "express";
import cors from "cors";
import { StaticReviewAgent, FixAgent, ReviewOrchestrator } from "@code-reviewer/agents";
import { ReviewRequest, ReviewResult } from "@code-reviewer/types";
import { RestGitHubConnector } from "@code-reviewer/github";
import { parseGithubUrl } from "./parseGithubUrl";
import { logReviewSession, logPullRequest, prisma } from "@code-reviewer/db";

const app = express();
app.use(cors());
app.use(express.json());

const staticReviewAgent = new StaticReviewAgent();
const fixAgent = new FixAgent();
const orchestrator = new ReviewOrchestrator(staticReviewAgent, fixAgent);

app.get("/", (req, res) => {
  res.json({ message: "Code Reviewer API running!" });
});

// Local code review
app.post("/api/review", async (req, res) => {
  try {
    const body = req.body as ReviewRequest;

    if (!body.code || typeof body.code !== "string") {
      return res.status(400).json({ error: "Missing 'code' in request body" });
    }

    const start = Date.now();
    const result: ReviewResult = await orchestrator.reviewWithFix(body);
    const duration = Date.now() - start;

    // log to DB (local source)
    await logReviewSession({
      source: "local",
      code: body.code,
      commentsCount: result.comments.length,
      hadFix: !!result.fix,
      repoUrl: undefined,
      branch: undefined,
      filePath: undefined,
      agentDurationMs: duration
    });

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === NEW: list branches for a repo ===
app.post("/api/github/branches", async (req, res) => {
  try {
    const { repoUrl, githubToken } = req.body as {
      repoUrl: string;
      githubToken: string;
    };

    if (!repoUrl || !githubToken) {
      return res
        .status(400)
        .json({ error: "repoUrl and githubToken are required" });
    }

    const { repoOwner, repoName } = parseGithubUrl(repoUrl);
    const gh = new RestGitHubConnector(githubToken);

    const branches = await gh.listBranches({ repoOwner, repoName });

    res.json({ branches });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// === NEW: list file tree for a branch ===
app.post("/api/github/tree", async (req, res) => {
  try {
    const { repoUrl, branch, githubToken } = req.body as {
      repoUrl: string;
      branch: string;
      githubToken: string;
    };

    if (!repoUrl || !branch || !githubToken) {
      return res
        .status(400)
        .json({ error: "repoUrl, branch and githubToken are required" });
    }

    const { repoOwner, repoName } = parseGithubUrl(repoUrl);
    const gh = new RestGitHubConnector(githubToken);

    const tree = await gh.listRepoTree({ repoOwner, repoName, ref: branch });

    // we'll send a flat list of file paths (only files) for now
    const files = tree.filter((t) => t.type === "file").map((t) => t.path);

    res.json({ files });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// === NEW: review a specific GitHub file ===
app.post("/api/review/github", async (req, res) => {
  try {
    const { repoUrl, branch, filePath, githubToken } = req.body as {
      repoUrl: string;
      branch: string;
      filePath: string;
      githubToken: string;
    };

    if (!repoUrl || !branch || !filePath || !githubToken) {
      return res.status(400).json({
        error: "repoUrl, branch, filePath and githubToken are required"
      });
    }

    const { repoOwner, repoName } = parseGithubUrl(repoUrl);
    const gh = new RestGitHubConnector(githubToken);

    const file = await gh.getFileContent({
      repoOwner,
      repoName,
      ref: branch,
      filePath
    });

    const reviewReq: ReviewRequest = { code: file.content, filePath };

    const start = Date.now();
    const result: ReviewResult = await orchestrator.reviewWithFix(reviewReq);
    const duration = Date.now() - start;

    // log GitHub review
    const reviewSession = await logReviewSession({
      source: "github",
      repoUrl,
      branch,
      filePath,
      code: file.content,
      commentsCount: result.comments.length,
      hadFix: !!result.fix,
      agentDurationMs: duration
    });

    res.json({
      filePath,
      branch,
      repoUrl,
      reviewSessionId: reviewSession.id,
      ...result
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

app.post("/api/review/github/pr", async (req, res) => {
  try {
    const { repoUrl, branch, filePath, githubToken } = req.body as {
      repoUrl: string;
      branch: string; // base branch
      filePath: string;
      githubToken: string;
    };

    if (!repoUrl || !branch || !filePath || !githubToken) {
      return res.status(400).json({
        error: "repoUrl, branch, filePath and githubToken are required"
      });
    }

    const { repoOwner, repoName } = parseGithubUrl(repoUrl);
    const gh = new RestGitHubConnector(githubToken);

    // 1) Get original file content
    const file = await gh.getFileContent({
      repoOwner,
      repoName,
      ref: branch,
      filePath
    });

    // 2) Run orchestrator to get fix
    const reviewReq: ReviewRequest = { code: file.content, filePath };

    const start = Date.now();
    const reviewResult: ReviewResult = await orchestrator.reviewWithFix(reviewReq);
    const duration = Date.now() - start;

    if (!reviewResult.fix) {
      return res.status(400).json({
        error: "No fix was suggested for this file; PR not created."
      });
    }

    // log review session for this PR
    const reviewSession = await logReviewSession({
      source: "github",
      repoUrl,
      branch,
      filePath,
      code: file.content,
      commentsCount: reviewResult.comments.length,
      hadFix: true,
      agentDurationMs: duration
    });

    const { fixedCode } = reviewResult.fix;

    // 3) Create a unique branch name
    const timestamp = Date.now();
    const safeFileName = filePath.replace(/[\/\.]/g, "-");
    const headBranch = `code-reviewer/fix-${safeFileName}-${timestamp}`;

    const prTitle = `Code Reviewer: Suggested fix for ${filePath}`;
    const prBody =
      `This PR was created automatically by Code Reviewer.\n\n` +
      `- Base branch: \`${branch}\`\n` +
      `- File: \`${filePath}\`\n\n` +
      `Please review the changes and run tests before merging.`;

    // 4) Call GitHub connector to create PR
    const prResult = await gh.createPullRequest({
      repoOwner,
      repoName,
      baseBranch: branch,
      headBranch,
      title: prTitle,
      body: prBody,
      changes: [
        {
          filePath,
          newContent: fixedCode,
          baseSha: file.sha
        }
      ]
    });

    // log PR in DB
    await logPullRequest({
      reviewSessionId: reviewSession.id,
      repoUrl,
      baseBranch: branch,
      headBranch,
      filePath,
      prNumber: prResult.prNumber,
      prUrl: prResult.prUrl
    });

    res.json({
      repoUrl,
      baseBranch: branch,
      headBranch,
      filePath,
      prUrl: prResult.prUrl,
      prNumber: prResult.prNumber,
      fix: reviewResult.fix
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    // Total review sessions
    const totalReviews = await prisma.reviewSession.count();

    // Breakdown by source
    const localReviews = await prisma.reviewSession.count({
      where: { source: "local" }
    });

    const githubReviews = await prisma.reviewSession.count({
      where: { source: "github" }
    });

    // Reviews where a fix was proposed
    const reviewsWithFix = await prisma.reviewSession.count({
      where: { hadFix: true }
    });

    // Total PRs
    const totalPRs = await prisma.pullRequestLog.count();

    // Average agent runtime (ms)
    const avgAgentRun = await prisma.agentRun.aggregate({
      _avg: { durationMs: true }
    });

    // Average comments per review
    const avgComments = await prisma.reviewSession.aggregate({
      _avg: { commentCount: true }
    });

    res.json({
      totalReviews,
      localReviews,
      githubReviews,
      reviewsWithFix,
      totalPRs,
      avgAgentDurationMs: avgAgentRun._avg.durationMs ?? 0,
      avgCommentsPerReview: avgComments._avg.commentCount ?? 0
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening at http://localhost:${PORT}`);
});
