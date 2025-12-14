-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('local', 'file', 'github');

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" SERIAL NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "repoUrl" TEXT,
    "branch" TEXT,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codeHash" TEXT NOT NULL DEFAULT '',
    "codePreview" TEXT,
    "commentCount" INTEGER NOT NULL,
    "hadFix" BOOLEAN NOT NULL,
    "agentDurationMs" INTEGER NOT NULL DEFAULT 0,
    "s3Key" TEXT,
    "evalOverallScore" INTEGER,
    "evalCorrectness" DOUBLE PRECISION,
    "evalSecurity" DOUBLE PRECISION,
    "evalStyle" DOUBLE PRECISION,
    "evalRiskLevel" TEXT,
    "evalSummary" TEXT,
    "evalKeyFindings" JSONB,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" SERIAL NOT NULL,
    "reviewSessionId" INTEGER NOT NULL,
    "agentName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestLog" (
    "id" SERIAL NOT NULL,
    "reviewSessionId" INTEGER NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headBranch" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullRequestLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestLog" ADD CONSTRAINT "PullRequestLog_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
