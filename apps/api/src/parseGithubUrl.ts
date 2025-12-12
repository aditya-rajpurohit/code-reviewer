export function parseGithubUrl(url: string): {
  repoOwner: string;
  repoName: string;
} {
  // supports:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\.git)?/);
  if (!match) {
    throw new Error("Invalid GitHub repo URL");
  }

  return {
    repoOwner: match[1],
    repoName: match[2].replace(/\.git$/, "")
  };
}