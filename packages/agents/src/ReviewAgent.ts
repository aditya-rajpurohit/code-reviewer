import { ReviewRequest, ReviewResult, ReviewComment } from "@code-reviewer/types";
import { BedrockChat } from "./BedrockClient";

export class ReviewAgent {
  async review(req: ReviewRequest): Promise<ReviewResult> {
    const prompt = `
        You are a senior software engineer performing a code review.

        Return ONLY valid JSON in this exact shape:
        {
        "comments": [
            {
            "id": "string",
            "lineStart": number,
            "lineEnd": number,
            "type": "bug" | "style" | "security" | "info",
            "message": "string"
            }
        ]
        }

        Focus on:
        - readability
        - maintainability
        - API design
        - performance concerns (if obvious)

        Code:
        ----------------
        ${req.code}
        ----------------
    `;

    const out = await BedrockChat({
      system:
        "You are an expert code reviewer. Always respond with strictly valid JSON.",
      user: prompt,
      temperature: 0
    });

    if (!out) {
      console.warn("ReviewAgent: no output from model");
      return { comments: [] };
    }

    try {
      const parsed = JSON.parse(out) as { comments?: ReviewComment[] };
      const comments = (parsed.comments || []).map((c, idx) => ({
        ...c,
        id: c.id || `review-${idx}`,
        sourceAgent: "ReviewAgent",
        priority: c.type === "bug" ? 40 : 20
      })) as any[];

      return { comments };
    } catch (err) {
      console.error("ReviewAgent JSON parse error:", out);
      return { comments: [] };
    }
  }
}
