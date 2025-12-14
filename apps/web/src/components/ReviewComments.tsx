"use client";

import type { ReviewResult } from "@code-reviewer/types";

interface Props {
  review: ReviewResult;
}

export function ReviewComments({ review }: Props) {
  if (!review.comments.length) {
    return <p style={{ color: "#9ca3af" }}>No issues found 🎉</p>;
  }

  return (
    <ul style={{ paddingLeft: 18, fontSize: 14 }}>
      {review.comments.map((c, idx) => (
        <li key={idx} style={{ marginBottom: 4 }}>
          [{c.type}] line {c.lineStart}
          {c.lineEnd && c.lineEnd !== c.lineStart ? `–${c.lineEnd}` : ""}:{" "}
          {c.message}
        </li>
      ))}
    </ul>
  );
}