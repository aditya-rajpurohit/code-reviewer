"use client";

import { useState } from "react";
import type { ReviewResult } from "@code-reviewer/types";
import { ReviewComments } from "@/components/ReviewComments";
import { FixViewer } from "@/components/FixViewer";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function LocalReviewPage() {
  const [code, setCode] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReview() {
    if (!code.trim()) return;
    setLoading(true);
    setReview(null);
    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data: ReviewResult = await res.json();
      setReview(data);
    } catch (err) {
      console.error("Local review error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 22 }}>Editor Review</h1>
      <p style={{ color: "#9ca3af", fontSize: 14 }}>
        Paste code below and run the multi-agent review pipeline. If a fix is
        proposed, you can download the updated code.
      </p>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your code here..."
        style={{
          width: "100%",
          minHeight: 260,
          borderRadius: 8,
          border: "1px solid rgba(148, 163, 184, 0.4)",
          padding: 12,
          fontFamily: "monospace",
          fontSize: 13,
          background: "#020617",
          color: "#e5e7eb"
        }}
      />

      <button
        onClick={runReview}
        disabled={loading || !code.trim()}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#4b5563" : "#22c55e",
          color: "#020617",
          fontWeight: 600,
          cursor: loading || !code.trim() ? "not-allowed" : "pointer",
          width: "fit-content"
        }}
      >
        {loading ? "Reviewing..." : "Run Review"}
      </button>

      {review && (
        <section style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Comments</h2>
            <ReviewComments review={review} />
          </div>
          <FixViewer review={review} originalCodeOverride={code} downloadFilename="fixed_code.txt" />
        </section>
      )}
    </div>
  );
}
