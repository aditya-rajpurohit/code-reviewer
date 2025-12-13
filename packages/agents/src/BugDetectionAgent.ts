import { ReviewRequest, ReviewResult, ReviewComment } from "@code-reviewer/types";
import { BedrockChat } from "./BedrockClient";

export class BugDetectionAgent {
  async review(req: ReviewRequest): Promise<ReviewResult> {
    const prompt = `
        You are a bug-finding expert.

        Find potential logic bugs and edge-case issues such as:
        - wrong conditions (== vs !=, < vs <=)
        - off-by-one errors
        - missing null/None checks
        - division by zero
        - incorrect return values
        - unreachable code
        - mishandled error cases

        Return ONLY valid JSON:
        {
        "comments": [
            {
            "id": "string",
            "lineStart": number,
            "lineEnd": number,
            "type": "bug",
            "message": "string"
            }
        ]
        }

        If there are no likely bugs, return {"comments": []}.

        Code:
        ----------------
        ${req.code}
        ----------------
    `;

    const out = await BedrockChat({
      system:
        "You are an expert at finding subtle logic bugs. Respond with strictly valid JSON.",
      user: prompt,
      temperature: 0
    });

    if (!out) {
      console.warn("BugDetectionAgent: no output from model");
      return { comments: [] };
    }

    try {
      const parsed = JSON.parse(out) as { comments?: ReviewComment[] };
      const comments = (parsed.comments || []).map((c, idx) => ({
        ...c,
        id: c.id || `bug-${idx}`,
        type: "bug",
        sourceAgent: "BugDetectionAgent",
        priority: 80
      })) as any[];

      return { comments };
    } catch (err) {
      console.error("BugDetectionAgent JSON parse error:", out);
      return { comments: [] };
    }
  }
}
