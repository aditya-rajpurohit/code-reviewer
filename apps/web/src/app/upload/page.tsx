"use client";

import { useState } from "react";
import type { ReviewResult } from "@code-reviewer/types";
import { ReviewComments } from "@/components/ReviewComments";
import { FixViewer } from "@/components/FixViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runUploadReview() {
    if (!file) return;
    setLoading(true);
    setReview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/review/file`, {
        method: "POST",
        body: formData
      });

      const data: ReviewResult = await res.json();
      setReview(data);
    } catch (err) {
      console.error("Upload review error", err);
    } finally {
      setLoading(false);
    }
  }

  const fixedName = file ? `fixed_${file.name}` : "fixed_code.txt";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 22 }}>File Upload Review</h1>
      <p style={{ color: "#9ca3af", fontSize: 14 }}>
        Upload a source file from your machine. We’ll review it with the same
        multi-agent pipeline and propose a fix you can download.
      </p>

      <input
        type="file"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setFile(f);
        }}
        style={{
          marginTop: 4,
          fontSize: 13
        }}
      />

      <button
        onClick={runUploadReview}
        disabled={loading || !file}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#4b5563" : "#22c55e",
          color: "#020617",
          fontWeight: 600,
          cursor: loading || !file ? "not-allowed" : "pointer",
          width: "fit-content"
        }}
      >
        {loading ? "Reviewing upload..." : "Run Review on File"}
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
