export interface GetFileContentParams {
  repoOwner: string;
  repoName: string;
  ref: string; // branch or commit
  filePath: string;
}

export interface FileContentResult {
  content: string;
  sha: string;
}

export interface ListBranchesParams {
  repoOwner: string;
  repoName: string;
}

export interface ListTreeParams {
  repoOwner: string;
  repoName: string;
  ref: string;
}

export interface CreatePrParams {
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  headBranch: string;
  title: string;
  body: string;
  changes: Array<{
    filePath: string;
    newContent: string;
    baseSha?: string;
  }>;
}

export interface CreatePrResult {
  prUrl: string;
  prNumber: number;
}

export interface TreeItem {
  path: string;
  type: "file" | "dir";
}

export interface IGitHubConnector {
  getFileContent(params: GetFileContentParams): Promise<FileContentResult>;
  listBranches(params: ListBranchesParams): Promise<string[]>;
  listRepoTree(params: ListTreeParams): Promise<TreeItem[]>;
  createPullRequest(params: CreatePrParams): Promise<CreatePrResult>;
}
