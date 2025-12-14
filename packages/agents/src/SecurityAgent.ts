import { ReviewRequest, ReviewResult, ReviewComment } from "@code-reviewer/types";
import { BedrockChat } from "./BedrockClient";

export class SecurityAgent {
  async review(req: ReviewRequest): Promise<ReviewResult> {
    const langHint = req.language
      ? `The code is written in ${req.language}.`
      : "Infer the language from the syntax.";

    const prompt = `
        ${langHint}
        You are an application security expert reviewing source code.

        Identify security issues such as:
        - hardcoded secrets / credentials
        - SQL injection
        - command injection
        - unsafe deserialization
        - missing input validation
        - insecure cryptography
        - path traversal
        - XSS (for web code)

        Return ONLY valid JSON:
        {
        "comments": [
            {
            "id": "string",
            "lineStart": number,
            "lineEnd": number,
            "type": "security",
            "message": "string"
            }
        ]
        }

        If there are no security issues, return {"comments": []}.

        Code:
        ----------------
        ${req.code}
        ----------------
    `;

    const out = await BedrockChat({
      system:
        "You are a strict security auditor. Respond strictly with valid JSON.",
      user: prompt,
      temperature: 0
    });

    if (!out) {
      console.warn("SecurityAgent: no output from model");
      return { comments: [] };
    }

    try {
      const parsed = JSON.parse(out) as { comments?: ReviewComment[] };
      const comments = (parsed.comments || []).map((c, idx) => ({
        ...c,
        id: c.id || `security-${idx}`,
        type: "security",
        sourceAgent: "SecurityAgent",
        priority: 100
      })) as any[];

      return { comments };
    } catch (err) {
      console.error("SecurityAgent JSON parse error:", out);
      return { comments: [] };
    }
  }
}
