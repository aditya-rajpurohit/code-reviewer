import { ReviewComment, FixResult, EvaluateResult } from "@code-reviewer/types";
import { BedrockChat } from "./BedrockClient";

export class EvaluateAgent {
  async evaluate(params: {
    code: string;
    comments: ReviewComment[];
    fix?: FixResult | null;
  }): Promise<EvaluateResult | null> {
    const { code, comments, fix } = params;

    const commentsSummary = comments
      .slice(0, 30)
      .map(
        (c, idx) =>
          `[${idx + 1}] type=${c.type} line=${c.lineStart}-${c.lineEnd}: ${c.message}`
      )
      .join("\n");

    const hasFix = !!fix;

    const prompt = `
        You are evaluating the quality of an AI-assisted code review and optional code fix.

        You will be given:
        - The original code
        - A list of review comments from multiple agents (security, bug, style, info)
        - Optionally, a proposed fixed version of the code

        Your job:
        1. Judge how well the comments cover the important issues.
        2. If a fix is present, judge how well it addresses the issues without breaking behavior.
        3. Score the outcome.

        Return ONLY valid JSON in this shape:

        {
        "overallScore": 0-100,
        "correctness": 0.0-1.0,
        "security": 0.0-1.0,
        "style": 0.0-1.0,
        "riskLevel": "low" | "medium" | "high",
        "summary": "short paragraph",
        "keyFindings": ["item 1", "item 2"]
        }

        Guidelines:
        - overallScore should reflect your overall confidence that the code is now correct, secure, and clean.
        - correctness/security/style are floats between 0.0 and 1.0.
        - riskLevel is your sense of remaining risk after the fix.

        ORIGINAL CODE:
        ----------------
        ${code}
        ----------------

        REVIEW COMMENTS:
        ----------------
        ${commentsSummary || "(no comments)"}
        ----------------

        ${hasFix ? `PROPOSED FIXED CODE:\n----------------\n${fix!.fixedCode}\n----------------` : "NO FIX WAS PROVIDED"}
    `;

    const out = await BedrockChat({
      system:
        "You are a precise evaluator of code review quality. You MUST respond with strictly valid JSON.",
      user: prompt,
      temperature: 0.1,
      maxTokens: 1000
    });

    if (!out) {
      console.warn("EvalAgent: no output from model");
      return null;
    }

    try {
      const parsed = JSON.parse(out) as EvaluateResult;
      return parsed;
    } catch (err) {
      console.error("EvalAgent JSON parse error:", out);
      return null;
    }
  }
}
