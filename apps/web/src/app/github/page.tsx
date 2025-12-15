"use client";

import { useEffect, useState } from "react";
import type React from "react";
import type { ReviewResult } from "@code-reviewer/types";
import { ReviewComments } from "@/components/ReviewComments";
import { FixViewer } from "@/components/FixViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface PrResult {
  repoUrl: string;
  baseBranch: string;
  headBranch: string;
  filePath: string;
  prUrl: string;
  prNumber: number;
}

export default function GithubPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [files, setFiles] = useState<string[]>([]);
  const [filePath, setFilePath] = useState("");

  const [review, setReview] = useState<ReviewResult | null>(null);

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

  // PR state
  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<PrResult | null>(null);

  // GitHub OAuth token
  const [githubToken, setGithubToken] = useState<string | null>(null);

  // Grab token from URL or localStorage on load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get("gh_token");

    if (tokenFromUrl) {
      setGithubToken(tokenFromUrl);
      localStorage.setItem("githubAccessToken", tokenFromUrl);

      // clean URL
      url.searchParams.delete("gh_token");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    const stored = localStorage.getItem("githubAccessToken");
    if (stored) {
      setGithubToken(stored);
    }
  }, []);

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/auth/github/login`;
  };

  const handleGitHubLogout = () => {
    localStorage.removeItem("githubAccessToken");
    setGithubToken(null);
    setFiles([]);
    setReview(null);
    setPrResult(null);
    setFilePath("");
  };

  // ------------------------- Fetch file tree (branch + repo) -------------------------

  async function loadFiles() {
    if (!githubToken) {
      alert("Please sign in with GitHub.");
      return;
    }
    if (!repoUrl.trim() || !branch.trim()) {
      alert("Enter repo URL and branch.");
      return;
    }

    setLoadingFiles(true);
    setFiles([]);
    setFilePath("");
    try {
      const res = await fetch(`${API_BASE}/api/github/tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, branch, githubToken })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Tree error:", res.status, text);
        alert("Failed to load repo files. Check console for details.");
        return;
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (err) {
      alert("Failed to load files.");
      console.error(err);
    } finally {
      setLoadingFiles(false);
    }
  }

  // ------------------------- Run review -------------------------

  async function runGithubReview() {
    if (!githubToken) {
      alert("Please sign in with GitHub.");
      return;
    }
    if (!repoUrl.trim() || !filePath.trim() || !branch.trim()) {
      alert("Repo URL, branch, and file path are required.");
      return;
    }

    setLoadingReview(true);
    setReview(null);
    setPrResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/review/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, filePath, branch, githubToken })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("GitHub review failed:", res.status, text);
        alert("GitHub review failed. Check console for details.");
        return;
      }

      const data: ReviewResult = await res.json();
      setReview(data);
    } catch (err) {
      console.error("GitHub review error", err);
      alert("Unexpected error during GitHub review. See console.");
    } finally {
      setLoadingReview(false);
    }
  }

  // ------------------------- Create PR with fix -------------------------

  async function createPr() {
    if (!githubToken) {
      alert("Please sign in with GitHub.");
      return;
    }
    if (!repoUrl.trim() || !filePath.trim() || !branch.trim()) {
      alert("Repo URL, branch, and file path are required to create a PR.");
      return;
    }

    setPrLoading(true);
    setPrResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/review/github/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          branch,
          filePath,
          githubToken
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Create PR failed:", res.status, text);
        alert("Failed to create PR. Check console for details.");
        return;
      }

      const data = (await res.json()) as PrResult;
      setPrResult(data);
    } catch (err) {
      console.error("Create PR error", err);
      alert("Unexpected error while creating PR. See console.");
    } finally {
      setPrLoading(false);
    }
  }

  // ------------------------- Derived values -------------------------

  const fixedName = filePath
    ? `fixed_${filePath.split("/").pop()}`
    : "fixed_code.txt";

  const reviewDisabled =
    loadingReview || !githubToken || !repoUrl.trim() || !filePath.trim();

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        maxWidth: 960,
        margin: "0 auto",
        paddingBottom: 24
      }}
    >
      <h1 style={{ fontSize: 22 }}>GitHub Review & PR</h1>

      {/* Auth Box */}
      <div style={authBox}>
        {!githubToken ? (
          <>
            <div style={{ fontSize: 13, color: "#e5e7eb" }}>
              Not authenticated with GitHub.
              <br />
              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                Sign in to fetch files and open PRs as your GitHub user.
              </span>
            </div>
            <button
              onClick={handleGitHubLogin}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#e5e7eb",
                color: "#020617",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Sign in with GitHub
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#e5e7eb" }}>
              ✅ Connected to GitHub via OAuth.
              <br />
              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                You can load files, review, and create PRs.
              </span>
            </div>
            <button
              onClick={handleGitHubLogout}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid rgba(148, 163, 184, 0.6)",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              Sign out
            </button>
          </>
        )}
      </div>

      <p style={{ color: "#9ca3af", fontSize: 14 }}>
        Provide a GitHub repo URL and branch, load the file list, pick a file,
        then run the multi-agent review. If the fix looks good, you can create a
        PR with one click.
      </p>

      {/* Repo + Branch / File Controls */}
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontSize: 13 }}>
          Repository URL
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 13 }}>
          Branch
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            style={inputStyle}
          />
        </label>

        <button
          onClick={loadFiles}
          disabled={!githubToken || !repoUrl.trim() || !branch.trim() || loadingFiles}
          style={smallButton}
        >
          {loadingFiles ? "Loading files..." : "Load repo files"}
        </button>

        {files.length > 0 && (
          <label style={{ fontSize: 13 }}>
            Select file to review
            <select
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- choose file --</option>
              {files.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Manual override, just in case */}
        <label style={{ fontSize: 11, color: "#9ca3af" }}>
          Or override file path manually
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/example.py"
            style={inputStyle}
          />
        </label>
      </div>

      {/* Review button */}
      <button
        onClick={runGithubReview}
        disabled={reviewDisabled}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: reviewDisabled ? "#4b5563" : "#22c55e",
          color: "#020617",
          fontWeight: 600,
          cursor: reviewDisabled ? "not-allowed" : "pointer",
          width: "fit-content"
        }}
      >
        {loadingReview ? "Reviewing from GitHub..." : "Run GitHub Review"}
      </button>

      {/* Results */}
      {review && (
        <section
          style={{
            marginTop: 16,
            display: "grid",
            gap: 16,
            overflowX: "hidden"
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Comments</h2>
            <ReviewComments review={review} />
          </div>

          <FixViewer review={review} downloadFilename={fixedName} />

          {/* PR actions */}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={createPr}
              disabled={prLoading || !githubToken || !filePath}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: prLoading ? "#4b5563" : "#38bdf8",
                color: "#020617",
                fontWeight: 600,
                cursor:
                  prLoading || !githubToken || !filePath
                    ? "not-allowed"
                    : "pointer",
                width: "fit-content"
              }}
            >
              {prLoading ? "Creating PR..." : "Create PR with this Fix"}
            </button>

            {prResult && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#e5e7eb" }}>
                <div>
                  PR created:{" "}
                  <a
                    href={prResult.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8" }}
                  >
                    {prResult.prUrl}
                  </a>
                </div>
                <div>
                  Base branch: <code>{prResult.baseBranch}</code>
                </div>
                <div>
                  Head branch: <code>{prResult.headBranch}</code>
                </div>
                <div>
                  File: <code>{prResult.filePath}</code>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "#020617",
  color: "#e5e7eb",
  fontSize: 13
};

const authBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#1d4ed8",
  color: "#e5e7eb",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  height: 32,
  width: "fit-content"
};
