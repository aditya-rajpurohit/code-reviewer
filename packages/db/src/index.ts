import { Prisma, PrismaClient, ReviewSource as ReviewSourceEnum } from "@prisma/client";
import crypto from "crypto";

export const prisma = new PrismaClient();

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code, "utf8").digest("hex");
}

function makePreview(code: string, maxLen = 400): string {
  const trimmed = code.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "\n/* ... truncated ... */";
}

export async function logReviewSession(params: {
  source: "local" | "file" | "github";
  repoUrl?: string;
  branch?: string;
  filePath?: string;
  code: string;
  commentsCount: number;
  hadFix: boolean;
  agentDurationMs: number;

  s3Key?: string | null;

  evalOverallScore?: number | null;
  evalCorrectness?: number | null;
  evalSecurity?: number | null;
  evalStyle?: number | null;
  evalRiskLevel?: string | null;
  evalSummary?: string | null;
  evalKeyFindings?: string[] | null;

}) {
  const {
    source,
    repoUrl,
    branch,
    filePath,
    code,
    commentsCount,
    hadFix,
    agentDurationMs,
    s3Key,
    evalOverallScore,
    evalCorrectness,
    evalSecurity,
    evalStyle,
    evalRiskLevel,
    evalSummary,
    evalKeyFindings
  } = params;

  const preview = makePreview(code);
  const codeHash = hashCode(code);
  
  const review = await prisma.reviewSession.create({
    data: {
      source: source as ReviewSourceEnum,
      repoUrl: repoUrl ?? null,
      branch: branch ?? null,
      filePath: filePath ?? null,
      codePreview: preview,
      codeHash,
      commentCount: commentsCount,
      hadFix,
      agentDurationMs: Math.round(agentDurationMs),

      s3Key: s3Key ?? null,

      evalOverallScore: evalOverallScore ?? null,
      evalCorrectness: evalCorrectness ?? null,
      evalSecurity: evalSecurity ?? null,
      evalStyle: evalStyle ?? null,
      evalRiskLevel: evalRiskLevel ?? null,
      evalSummary: evalSummary ?? null,
      evalKeyFindings:
      params.evalKeyFindings === undefined
        ? undefined
        : params.evalKeyFindings === null
        ? Prisma.JsonNull
        : (params.evalKeyFindings as Prisma.InputJsonValue)
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
