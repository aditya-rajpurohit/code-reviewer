"use client";

import { useState } from "react";
import type { ReviewResult } from "@code-reviewer/types";
import { ReviewComments } from "@/components/ReviewComments";
import { FixViewer } from "@/components/FixViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function GithubReviewPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [branch, setBranch] = useState("main");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runGithubReview() {
    if (!repoUrl.trim() || !filePath.trim()) return;
    setLoading(true);
    setReview(null);
    try {
      const res = await fetch(`${API_BASE}/api/review/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, filePath, branch })
      });
      const data: ReviewResult = await res.json();
      setReview(data);
    } catch (err) {
      console.error("GitHub review error", err);
    } finally {
      setLoading(false);
    }
  }

  const fixedName = filePath ? `fixed_${filePath.split("/").pop()}` : "fixed_code.txt";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 22 }}>GitHub URL Review</h1>
      <p style={{ color: "#9ca3af", fontSize: 14 }}>
        Provide a public GitHub repo URL and file path. The system will fetch
        the file, run the multi-agent review, and suggest a fix you can
        download (and later turn into a PR).
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
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
          File path within repo
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/example.py"
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
      </div>

      <button
        onClick={runGithubReview}
        disabled={loading || !repoUrl.trim() || !filePath.trim()}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#4b5563" : "#22c55e",
          color: "#020617",
          fontWeight: 600,
          cursor:
            loading || !repoUrl.trim() || !filePath.trim()
              ? "not-allowed"
              : "pointer",
          width: "fit-content"
        }}
      >
        {loading ? "Reviewing from GitHub..." : "Run GitHub Review"}
      </button>

      {review && (
        <section style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Comments</h2>
            <ReviewComments review={review} />
          </div>
          <FixViewer review={review} downloadFilename={fixedName} />
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
