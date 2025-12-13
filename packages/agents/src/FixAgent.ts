import { FixResult } from "@code-reviewer/types";
import { BedrockChat } from "./BedrockClient";

export class FixAgent {
  async suggestFix(params: {
    code: string;
    filePath?: string;
  }): Promise<FixResult | null> {
    const { code, filePath } = params;

    if (code.length > 20000) {
      console.warn("FixAgent: code too long, skipping fix.");
      return null;
    }

    const prompt = `
      You are an expert software engineer.

      You will be given the full contents of a single source file.

      Goals:
      - Fix obvious bugs and edge cases
      - Improve clarity and structure
      - Add basic error handling where appropriate
      - Preserve original behavior unless clearly wrong
      - Keep the same language and general style
      - Do NOT add large new features

      IMPORTANT:
      - Return ONLY the full revised code of the file.
      - Do NOT wrap the code in backticks.
      - Do NOT add commentary or explanation before or after.
      - If no meaningful changes are needed, return the original code exactly.

      File path (for context): ${filePath ?? "unknown"}

      Current code:
      ----------------
      ${code}
      ----------------
    `;

    const fixedCode = await BedrockChat({
      system:
        "You are a careful refactoring assistant. You output only revised code.",
      user: prompt,
      temperature: 0.2,
      maxTokens: 8000
    });

    if (!fixedCode) {
      console.warn("FixAgent: model returned no fix");
      return null;
    }

    if (normalize(code) === normalize(fixedCode)) {
      // Treat as "no fix"
      return null;
    }

    return {
      originalCode: code,
      fixedCode,
      diff: "" // You can compute a real diff on the UI/backend side
    };
  }
}

function normalize(s: string): string {
  return s.replace(/\s+$/g, "");
}
