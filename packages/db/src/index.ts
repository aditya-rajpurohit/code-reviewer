import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function logReviewSession(params: {
  source: "local" | "github";
  repoUrl?: string;
  branch?: string;
  filePath?: string;
  code: string;
  commentsCount: number;
  hadFix: boolean;
  agentDurationMs: number;
}) {
  const {
    source,
    repoUrl,
    branch,
    filePath,
    code,
    commentsCount,
    hadFix,
    agentDurationMs
  } = params;

  const preview =
    code.length > 400 ? code.slice(0, 400) + "\n/* ... truncated ... */" : code;

  const review = await prisma.reviewSession.create({
    data: {
      source,
      repoUrl: repoUrl ?? null,
      branch: branch ?? null,
      filePath: filePath ?? null,
      codePreview: preview,
      commentCount: commentsCount,
      hadFix
    }
  });

  await prisma.agentRun.create({
    data: {
      reviewSessionId: review.id,
      agentName: "ReviewOrchestrator",
      durationMs: Math.round(agentDurationMs)
    }
  });

  return review;
}

export async function logPullRequest(params: {
  reviewSessionId: number;
  repoUrl: string;
  baseBranch: string;
  headBranch: string;
  filePath: string;
  prNumber: number;
  prUrl: string;
}) {
  return prisma.pullRequestLog.create({
    data: params
  });
}
