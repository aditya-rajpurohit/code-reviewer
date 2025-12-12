import { Octokit } from "@octokit/rest";

import {
  IGitHubConnector,
  GetFileContentParams,
  ListBranchesParams,
  ListTreeParams,
  TreeItem,
  CreatePrParams,
  CreatePrResult,
  FileContentResult
} from "./IGitHubConnector";


export class RestGitHubConnector implements IGitHubConnector {
  private octokit: Octokit;

  constructor(privateToken: string) {
    this.octokit = new Octokit({ auth: privateToken });
  }

  async getFileContent(params: GetFileContentParams): Promise<FileContentResult> {
    const { repoOwner, repoName, ref, filePath } = params;

    const res = await this.octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      ref
    });

    if (!Array.isArray(res.data) && "content" in res.data) {
      const buff = Buffer.from(
        res.data.content,
        (res.data.encoding as BufferEncoding) || "base64"
      );
      return {
        content: buff.toString("utf8"),
        sha: res.data.sha
      };
    }

    throw new Error("Expected file content but got directory or unknown type");
  }

  async listBranches(params: ListBranchesParams): Promise<string[]> {
    const { repoOwner, repoName } = params;
    const res = await this.octokit.repos.listBranches({
      owner: repoOwner,
      repo: repoName
    });
    return res.data.map((b) => b.name);
  }

  async listRepoTree(params: ListTreeParams): Promise<TreeItem[]> {
    const { repoOwner, repoName, ref } = params;

    const res = await this.octokit.git.getTree({
      owner: repoOwner,
      repo: repoName,
      tree_sha: ref,
      recursive: "true"
    });

    const tree = res.data.tree || [];

    return tree
      .filter((item) => item.type === "blob" || item.type === "tree")
      .map((item) => ({
        path: item.path || "",
        type: item.type === "tree" ? "dir" : "file"
      }));
  }

  async createPullRequest(params: CreatePrParams): Promise<CreatePrResult> {
    const { repoOwner, repoName, baseBranch, headBranch, title, body, changes } = params;

    // 1) Get base branch SHA
    const baseRef = await this.octokit.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: `heads/${baseBranch}`
    });

    const baseSha = baseRef.data.object.sha;

    // 2) Create new branch from base
    const refName = `refs/heads/${headBranch}`;
    await this.octokit.git.createRef({
      owner: repoOwner,
      repo: repoName,
      ref: refName,
      sha: baseSha
    });

    // 3) Apply file changes on new branch
    for (const change of changes) {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: change.filePath,
        message: title,
        content: Buffer.from(change.newContent, "utf8").toString("base64"),
        branch: headBranch,
        sha: change.baseSha // <-- important when file already exists
      });
    }

    // 4) Create the PR
    const pr = await this.octokit.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title,
      body,
      head: headBranch,
      base: baseBranch
    });

    return {
      prUrl: pr.data.html_url,
      prNumber: pr.data.number
    };
  }
}
