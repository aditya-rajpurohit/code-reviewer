import { ReviewRequest, ReviewResult, ReviewComment } from "@code-reviewer/types";

export class StaticAgent {
  async review(req: ReviewRequest): Promise<ReviewResult> {
    const comments: ReviewComment[] = [];
    const lines = req.code.split("\n");

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;

      if (line.length > 100) {
        comments.push({
          id: `static-longline-${lineNo}`,
          lineStart: lineNo,
          lineEnd: lineNo,
          type: "style",
          message: "Line exceeds 100 characters; consider breaking it up for readability.",
          sourceAgent: "StaticAgent",
          priority: 10
        } as any);
      }

      if (line.includes("TODO")) {
        comments.push({
          id: `static-todo-${lineNo}`,
          lineStart: lineNo,
          lineEnd: lineNo,
          type: "info",
          message: "TODO found; ensure this is addressed or documented.",
          sourceAgent: "StaticAgent",
          priority: 5
        } as any);
      }
    });

    return { comments };
  }
}
