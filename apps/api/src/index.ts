import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import { StaticAgent, ReviewAgent, SecurityAgent, BugDetectionAgent, FixAgent, EvaluateAgent, Orchestrator } from "@code-reviewer/agents";
import { ReviewRequest, ReviewResult } from "@code-reviewer/types";
import { RestGitHubConnector } from "@code-reviewer/github";
import { parseGithubUrl } from "./parseGithubUrl";
import { logReviewSession, logPullRequest, prisma } from "@code-reviewer/db";
import { uploadFixedCodeArtifact } from "./s3";
import path from "path";
import dotenv from "dotenv";

// Load .env from monorepo root: /code-reviewer/.env
dotenv.config({ path: path.resolve(process.cwd(), "..", "..", ".env")});

console.log("AWS_REGION:", process.env.AWS_REGION);
console.log("AWS_ACCESS_KEY_ID exists:", !!process.env.AWS_ACCESS_KEY_ID);
console.log("BEDROCK_MODEL_ID:", process.env.BEDROCK_MODEL_ID);
console.log("S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME);
console.log("GITHUB_CLIENT_ID exists:", !!process.env.GITHUB_CLIENT_ID);
console.log("GITHUB_OAUTH_REDIRECT:", process.env.GITHUB_OAUTH_REDIRECT || "<undefined>");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 } // 512KB;
});

const app = express();
app.use(cors());
app.use(express.json());

const staticAgent = new StaticAgent();
const reviewAgent = new ReviewAgent();
const securityAgent = new SecurityAgent();
const bugAgent = new BugDetectionAgent();
const fixAgent = new FixAgent();
const evaluateAgent = new EvaluateAgent();

const orchestrator = new Orchestrator(
  [staticAgent, reviewAgent, securityAgent, bugAgent],
  fixAgent,
  evaluateAgent
);

type SourceType = "local" | "file" | "github";

async function runReviewAndLog(params: {
  source: SourceType;
  code: string;
  filePath?: string;
  repoUrl?: string;
  branch?: string;
}): Promise<{ result: ReviewResult; reviewSessionId: number }> {
  const { source, code, filePath, repoUrl, branch } = params;

  const start = Date.now();
  const reviewReq: ReviewRequest = { code, filePath};
  const result: ReviewResult = await orchestrator.reviewWithFix(reviewReq);
  const duration = Date.now() - start;
  const evalResult = result.evaluation;

  // Generate a unique-ish seed for S3 key
  const sessionKeySeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  let s3Key: string | null = null;

  if (result.fix?.fixedCode) {
    console.log("[S3] attempting upload for source:", source);
    s3Key =
      (await uploadFixedCodeArtifact({
        sessionKeySeed,
        source: source as any,
        filePath,
        fixedCode: result.fix.fixedCode
      })) ?? null;
    console.log("[S3] upload result key:", s3Key);
  } else {    
    console.log("[S3] no fix generated; skipping S3 upload");
  }

  const reviewSession = await logReviewSession({
    source,
    code,
    commentsCount: result.comments.length,
    hadFix: !!result.fix,
    repoUrl,
    branch,
    filePath,
    agentDurationMs: duration,
    s3Key,
    evalOverallScore: evalResult?.overallScore ?? null,
    evalCorrectness: evalResult?.correctness ?? null,
    evalSecurity: evalResult?.security ?? null,
    evalStyle: evalResult?.style ?? null,
    evalRiskLevel: evalResult?.riskLevel ?? null,
    evalSummary: evalResult?.summary ?? null,
    evalKeyFindings: evalResult?.keyFindings ?? null
  });

  return { result, reviewSessionId: reviewSession.id };
}

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
    
    const { result } = await runReviewAndLog({
      source: "local",
      code: body.code,
      filePath: body.filePath
    });

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// File upload code review
app.post("/api/review/file", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Missing 'file' in form data" });
      }

      const code = file.buffer.toString("utf-8");
      const filePath = file.originalname;

      const { result } = await runReviewAndLog({
        source: "file",
        code,
        filePath
      });

      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// === GitHub OAuth: start login ===
app.get("/auth/github/login", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT;

  if (!clientId || !redirectUri) {
    return res.status(500).send("GitHub OAuth is not configured (missing CLIENT_ID or REDIRECT).");
  }

  const scope = "repo";
  const githubAuthUrl =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(githubAuthUrl);
});

// === GitHub OAuth: callback ===
app.get("/auth/github/callback", async (req, res) => {
  try {
    const code = req.query.code as string | undefined;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT;
    const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3000";

    if (!code) {
      return res.status(400).send("Missing ?code from GitHub OAuth callback.");
    }
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).send("GitHub OAuth not fully configured on server.");
    }

    // code for access_token
    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      },
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    const accessToken = tokenResp.data.access_token as string | undefined;

    if (!accessToken) {
      console.error("GitHub OAuth: no access_token in response", tokenResp.data);
      return res.status(500).send("Failed to obtain access token from GitHub.");
    }

    const redirectTo = `${webAppUrl}/github?gh_token=${encodeURIComponent(accessToken)}`;

    res.redirect(redirectTo);
  } catch (err: any) {
    console.error("GitHub OAuth callback error:", err?.message ?? err);
    res.status(500).send("GitHub OAuth callback failed.");
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

    const { result, reviewSessionId } = await runReviewAndLog({
      source: "github",
      code: file.content,
      filePath,
      repoUrl,
      branch
    });

    res.json({
      filePath,
      branch,
      repoUrl,
      reviewSessionId,
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
    const totalReviews = await prisma.reviewSession.count();

    const localReviews = await prisma.reviewSession.count({
      where: { source: "local" }
    });

    const githubReviews = await prisma.reviewSession.count({
      where: { source: "github" }
    });

    const fileReviews = await prisma.reviewSession.count({
      where: { source: "file" }
    });

    const reviewsWithFix = await prisma.reviewSession.count({
      where: { hadFix: true }
    });

    const totalPRs = await prisma.pullRequestLog.count();

    const avgAgentRun = await prisma.agentRun.aggregate({
      _avg: { durationMs: true }
    });

    const avgComments = await prisma.reviewSession.aggregate({
      _avg: { commentCount: true }
    });

    res.json({
      totalReviews,
      localReviews,
      fileReviews,
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
