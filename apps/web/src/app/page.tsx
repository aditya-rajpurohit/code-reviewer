"use client";

import { useState } from "react";

type CommentType = "style" | "bug" | "security" | "info";

interface ReviewComment {
  id: string;
  message: string;
  lineStart: number;
  lineEnd: number;
  type: CommentType;
}

interface FixResult {
  originalCode: string;
  fixedCode: string;
  diff: string;
}

interface ReviewResult {
  comments: ReviewComment[];
  repoUrl?: string;
  branch?: string;
  filePath?: string;
  fix?: FixResult;
}

interface PrResult {
  prUrl: string;
  prNumber: number;
  baseBranch: string;
  headBranch: string;
  filePath: string;
}

interface Metrics {
  totalReviews: number;
  localReviews: number;
  githubReviews: number;
  reviewsWithFix: number;
  totalPRs: number;
  avgAgentDurationMs: number;
  avgCommentsPerReview: number;
}

export default function Home() {
  // Local code review state
  const [code, setCode] = useState("// Paste your code here\n");
  const [localReview, setLocalReview] = useState<ReviewResult | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // GitHub review state
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [ghReview, setGhReview] = useState<ReviewResult | null>(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghMetaLoading, setGhMetaLoading] = useState(false);

  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<PrResult | null>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const API_BASE = "http://localhost:4000";

  // Local review function
  const runLocalReview = async () => {
    setLocalLoading(true);
    setLocalReview(null);
    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = (await res.json()) as ReviewResult;
      setLocalReview(data);
    } catch (e) {
      console.error(e);
      alert("Error calling local review API");
    } finally {
      setLocalLoading(false);
    }
  };

  const loadBranches = async () => {
    setGhMetaLoading(true);
    setBranches([]);
    setFiles([]);
    setSelectedBranch("");
    setSelectedFile("");
    try {
      const res = await fetch(`${API_BASE}/api/github/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, githubToken })
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      setBranches(data.branches || []);
    } catch (e) {
      console.error(e);
      alert("Error loading branches");
    } finally {
      setGhMetaLoading(false);
    }
  };

  const loadFiles = async (branch: string) => {
    setGhMetaLoading(true);
    setFiles([]);
    setSelectedFile("");
    try {
      const res = await fetch(`${API_BASE}/api/github/tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, branch, githubToken })
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      setFiles(data.files || []);
    } catch (e) {
      console.error(e);
      alert("Error loading files");
    } finally {
      setGhMetaLoading(false);
    }
  };

  const runGithubReview = async () => {
    if (!selectedBranch || !selectedFile) {
      alert("Select a branch and file first");
      return;
    }
    setGhLoading(true);
    setGhReview(null);
    try {
      const res = await fetch(`${API_BASE}/api/review/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          branch: selectedBranch,
          filePath: selectedFile,
          githubToken
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      const result: ReviewResult = {
        comments: data.comments || [],
        repoUrl: data.repoUrl,
        branch: data.branch,
        filePath: data.filePath,
        fix: data.fix
      };
      setGhReview(result);
    } catch (e) {
      console.error(e);
      alert("Error calling GitHub review API");
    } finally {
      setGhLoading(false);
    }
  };

  const createPr = async () => {
    if (!repoUrl || !selectedBranch || !selectedFile || !githubToken) {
      alert("Missing repo URL, branch, file, or token.");
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
          branch: selectedBranch,
          filePath: selectedFile,
          githubToken
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      const result: PrResult = {
        prUrl: data.prUrl,
        prNumber: data.prNumber,
        baseBranch: data.baseBranch,
        headBranch: data.headBranch,
        filePath: data.filePath
      };
      setPrResult(result);
    } catch (e) {
      console.error(e);
      alert("Error creating PR");
    } finally {
      setPrLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      const res = await fetch(`${API_BASE}/api/metrics`);
      const data = await res.json();
      if (data.error) {
        alert(`Error loading metrics: ${data.error}`);
        return;
      }
      setMetrics(data as Metrics);
    } catch (e) {
      console.error(e);
      alert("Error fetching metrics");
    } finally {
      setMetricsLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Code Reviewer – GitHub + Local Prototype</h1>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Local code review column */}
        <section style={{ flex: 1, borderRight: "1px solid #ccc", paddingRight: 16 }}>
          <h2>Local Code Review</h2>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ width: "100%", height: 300, fontFamily: "monospace" }}
          />
          <button onClick={runLocalReview} disabled={localLoading} style={{ marginTop: 8 }}>
            {localLoading ? "Reviewing..." : "Run Local Review"}
          </button>
          <div style={{ marginTop: 16 }}>
            <h3>Comments</h3>
            {!localReview && <p>No review yet.</p>}
            {localReview && localReview.comments.length === 0 && <p>No issues found 🎉</p>}
            {localReview && localReview.comments.length > 0 && (
              <ul>
                {localReview.comments.map((c) => (
                  <li key={c.id}>
                    <strong>[{c.type}]</strong> line {c.lineStart}: {c.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* GitHub review column */}
        <section style={{ flex: 1 }}>
          <h2>GitHub File Review</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="GitHub repo URL (e.g. https://github.com/user/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <input
              placeholder="GitHub Personal Access Token (temporary)"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <button onClick={loadBranches} disabled={ghMetaLoading || !repoUrl || !githubToken}>
              {ghMetaLoading ? "Loading branches..." : "Load Branches"}
            </button>

            {branches.length > 0 && (
              <>
                <label>
                  Branch:
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      const b = e.target.value;
                      setSelectedBranch(b);
                      if (b) {
                        loadFiles(b);
                      }
                    }}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {files.length > 0 && (
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: 4,
                  marginTop: 8
                }}
              >
                <strong>Select file:</strong>
                <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                  {files.map((path) => (
                    <li
                      key={path}
                      onClick={() => setSelectedFile(path)}
                      style={{
                        padding: "2px 4px",
                        cursor: "pointer",
                        backgroundColor:
                          selectedFile === path ? "rgba(0, 120, 255, 0.15)" : "transparent",
                        fontFamily: "monospace",
                        fontSize: 12
                      }}
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={runGithubReview}
              disabled={ghLoading || !selectedBranch || !selectedFile}
              style={{ marginTop: 8 }}
            >
              {ghLoading ? "Reviewing file..." : "Review Selected File"}
            </button>
          </div>

          {/* GitHub review result */}
          <div style={{ marginTop: 16 }}>
            <h3>GitHub Review Comments</h3>

            {!ghReview && <p>No GitHub review yet.</p>}

            {ghReview && ghReview.comments.length === 0 && (
              <p>No issues found 🎉</p>
            )}

            {ghReview && ghReview.comments.length > 0 && (
              <>
                <p>
                  Repo: <code>{ghReview.repoUrl}</code>
                  <br />
                  Branch: <code>{ghReview.branch}</code>
                  <br />
                  File: <code>{ghReview.filePath}</code>
                </p>
                <ul>
                  {ghReview.comments.map((c) => (
                    <li key={c.id}>
                      <strong>[{c.type}]</strong> line {c.lineStart}: {c.message}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {ghReview?.fix && (
              <div style={{ marginTop: 16 }}>
                <h4>AI-Suggested Fix (GitHub)</h4>
                <p>
                  <strong>Fixed Code:</strong>
                </p>
                <pre
                  style={{
                    background: "#3b3b3b",
                    padding: 8,
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: "auto",
                    fontFamily: "monospace",
                    fontSize: 12
                  }}
                >
                  {ghReview.fix.fixedCode}
                </pre>

                <button
                  onClick={createPr}
                  disabled={prLoading}
                  style={{ marginTop: 8 }}
                >
                  {prLoading ? "Creating PR..." : "Create PR with this Fix"}
                </button>
              </div>
            )}

            {prResult && (
              <div style={{ marginTop: 12 }}>
                <p>
                  PR created:{" "}
                  <a href={prResult.prUrl} target="_blank" rel="noreferrer">
                    {prResult.prUrl}
                  </a>
                  <br />
                  Base branch: <code>{prResult.baseBranch}</code>
                  <br />
                  Head branch: <code>{prResult.headBranch}</code>
                  <br />
                  File: <code>{prResult.filePath}</code>
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 32, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3>System Metrics</h3>
            <button onClick={loadMetrics} disabled={metricsLoading}>
              {metricsLoading ? "Loading..." : "Refresh Metrics"}
            </button>

            {!metrics && !metricsLoading && (
              <p style={{ marginTop: 8 }}>No metrics loaded yet.</p>
            )}

            {metrics && (
              <ul style={{ marginTop: 8 }}>
                <li>Total reviews: {metrics.totalReviews}</li>
                <li>Local reviews: {metrics.localReviews}</li>
                <li>GitHub reviews: {metrics.githubReviews}</li>
                <li>Reviews with fixes: {metrics.reviewsWithFix}</li>
                <li>PRs created: {metrics.totalPRs}</li>
                <li>Avg agent duration: {Math.round(metrics.avgAgentDurationMs)} ms</li>
                <li>Avg comments per review: {metrics.avgCommentsPerReview.toFixed(2)}</li>
              </ul>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}
