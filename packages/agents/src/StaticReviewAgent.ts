import { ReviewComment, ReviewRequest, ReviewResult } from "@code-reviewer/types";

export class StaticReviewAgent {
  async review(req: ReviewRequest): Promise<ReviewResult> {
    const lines = req.code.split("\n");

    const comments: ReviewComment[] = [];

    // Dumb rule 1: flag lines longer than 100 chars as "style"
    lines.forEach((line, idx) => {
      if (line.length > 100) {
        comments.push({
          id: `long-line-${idx + 1}`,
          message: "Line is quite long; consider breaking it up for readability.",
          lineStart: idx + 1,
          lineEnd: idx + 1,
          type: "style"
        });
      }
    });

    // Dumb rule 2: flag any TODO as info
    lines.forEach((line, idx) => {
      if (line.includes("TODO")) {
        comments.push({
          id: `todo-${idx + 1}`,
          message: "Found TODO comment. Ensure this is resolved or tracked.",
          lineStart: idx + 1,
          lineEnd: idx + 1,
          type: "info"
        });
      }
    });

    return { comments };
  }
}
