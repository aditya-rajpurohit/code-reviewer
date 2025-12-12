-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "repoUrl" TEXT,
    "branch" TEXT,
    "filePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codePreview" TEXT,
    "commentCount" INTEGER NOT NULL,
    "hadFix" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewSessionId" INTEGER NOT NULL,
    "agentName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRun_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequestLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewSessionId" INTEGER NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headBranch" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PullRequestLog_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
