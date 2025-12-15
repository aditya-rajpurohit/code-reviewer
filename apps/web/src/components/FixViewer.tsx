// "use client";

// import type { ReviewResult } from "@code-reviewer/types";

// interface Props {
//   review: ReviewResult;
//   originalCodeOverride?: string;
//   downloadFilename?: string;
// }

// export function FixViewer({
//   review,
//   originalCodeOverride,
//   downloadFilename
// }: Props) {
//   if (!review.fix) return null;

//   const originalCode =
//     originalCodeOverride || review.fix.originalCode || "// original code not available";
//   const fixedCode = review.fix.fixedCode;

//   const handleDownload = () => {
//     const blob = new Blob([fixedCode], {
//       type: "text/plain;charset=utf-8"
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = downloadFilename || "fixed_code.txt";
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <section style={{ display: "grid", gap: 8 }}>
//       <h2 style={{ fontSize: 18 }}>AI-Suggested Fix</h2>

//       {/* Side-by-side panels */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr",
//           gap: 8,
//           alignItems: "stretch"
//         }}
//       >
//         <div
//           style={{
//             borderRadius: 8,
//             border: "1px solid #333",
//             background: "#0b0b0b",
//             display: "flex",
//             flexDirection: "column",
//             minHeight: 200
//           }}
//         >
//           <div
//             style={{
//               padding: "6px 10px",
//               borderBottom: "1px solid #333",
//               fontSize: 12,
//               color: "#999"
//             }}
//           >
//             Original
//           </div>
//           <pre
//             style={{
//               flex: 1,
//               margin: 0,
//               padding: 10,
//               overflow: "auto",
//               fontFamily: "monospace",
//               fontSize: 12,
//               background: "#0b0b0b",
//               color: "#f5f5f5",
//               whiteSpace: "pre"
//             }}
//           >
//             {originalCode}
//           </pre>
//         </div>

//         <div
//           style={{
//             borderRadius: 8,
//             border: "1px solid #333",
//             background: "#050505",
//             display: "flex",
//             flexDirection: "column",
//             minHeight: 200
//           }}
//         >
//           <div
//             style={{
//               padding: "6px 10px",
//               borderBottom: "1px solid #333",
//               fontSize: 12,
//               color: "#ccc"
//             }}
//           >
//             Fixed
//           </div>
//           <pre
//             style={{
//               flex: 1,
//               margin: 0,
//               padding: 10,
//               overflow: "auto",
//               fontFamily: "monospace",
//               fontSize: 12,
//               background: "#050505",
//               color: "#f5f5f5",
//               whiteSpace: "pre"
//             }}
//           >
//             {fixedCode}
//           </pre>
//         </div>
//       </div>

//       <button
//         onClick={handleDownload}
//         style={{
//           marginTop: 8,
//           padding: "6px 12px",
//           borderRadius: 999,
//           border: "1px solid #444",
//           background: "#111",
//           color: "#f5f5f5",
//           fontSize: 13,
//           width: "fit-content",
//           cursor: "pointer"
//         }}
//       >
//         Download fixed code
//       </button>
//     </section>
//   );
// }


"use client";

import React, { useCallback } from "react";
import type { ReviewResult } from "@code-reviewer/types";

interface FixViewerProps {
  review: ReviewResult;
  downloadFilename: string;
}

export function FixViewer({ review, downloadFilename }: FixViewerProps) {
  const fix = review.fix;

  if (!fix) {
    return (
      <div style={{ fontSize: 13, color: "#9ca3af" }}>
        No fix was proposed. The code may already be in good shape.
      </div>
    );
  }

  const originalCode = fix.originalCode ?? "";
  const fixedCode = fix.fixedCode ?? "";

  const handleDownload = useCallback(() => {
    const blob = new Blob([fixedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename || "fixed_code.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [fixedCode, downloadFilename]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h2 style={{ fontSize: 18, margin: 0 }}>Suggested Fix</h2>

        <button
          onClick={handleDownload}
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
          Download fixed file
        </button>
      </div>

      {/* Original code (stacked) */}
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#9ca3af",
            marginBottom: 4
          }}
        >
          Original code
        </div>
        <pre style={codeBlockStyle}>{originalCode}</pre>
      </div>

      {/* Fixed code (stacked) */}
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#9ca3af",
            marginBottom: 4
          }}
        >
          Fixed code
        </div>
        <pre style={codeBlockStyle}>{fixedCode}</pre>
      </div>
    </div>
  );
}

const codeBlockStyle: React.CSSProperties = {
  marginTop: 0,
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(31, 41, 55, 0.9)",
  background: "#020617",
  color: "#e5e7eb",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: 12,
  whiteSpace: "pre",
  tabSize: 2,
  maxHeight: "60vh",
  overflowY: "auto",
  overflowX: "auto",
  lineHeight: "1.4",
  boxSizing: "border-box"
};
