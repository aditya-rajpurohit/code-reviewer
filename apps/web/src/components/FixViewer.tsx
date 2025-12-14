"use client";

import type { ReviewResult } from "@code-reviewer/types";

interface Props {
  review: ReviewResult;
  originalCodeOverride?: string;
  downloadFilename?: string;
}

export function FixViewer({
  review,
  originalCodeOverride,
  downloadFilename
}: Props) {
  if (!review.fix) return null;

  const originalCode =
    originalCodeOverride || review.fix.originalCode || "// original code not available";
  const fixedCode = review.fix.fixedCode;

  const handleDownload = () => {
    const blob = new Blob([fixedCode], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename || "fixed_code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ fontSize: 18 }}>AI-Suggested Fix</h2>

      {/* Side-by-side panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          alignItems: "stretch"
        }}
      >
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #333",
            background: "#0b0b0b",
            display: "flex",
            flexDirection: "column",
            minHeight: 200
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #333",
              fontSize: 12,
              color: "#999"
            }}
          >
            Original
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 10,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: 12,
              background: "#0b0b0b",
              color: "#f5f5f5",
              whiteSpace: "pre"
            }}
          >
            {originalCode}
          </pre>
        </div>

        <div
          style={{
            borderRadius: 8,
            border: "1px solid #333",
            background: "#050505",
            display: "flex",
            flexDirection: "column",
            minHeight: 200
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #333",
              fontSize: 12,
              color: "#ccc"
            }}
          >
            Fixed
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 10,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: 12,
              background: "#050505",
              color: "#f5f5f5",
              whiteSpace: "pre"
            }}
          >
            {fixedCode}
          </pre>
        </div>
      </div>

      <button
        onClick={handleDownload}
        style={{
          marginTop: 8,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid #444",
          background: "#111",
          color: "#f5f5f5",
          fontSize: 13,
          width: "fit-content",
          cursor: "pointer"
        }}
      >
        Download fixed code
      </button>
    </section>
  );
}
