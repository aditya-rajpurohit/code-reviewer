import { FixResult } from "@code-reviewer/types";

export class FixAgent {
  async suggestFix(params: { code: string; filePath?: string }): Promise<FixResult | null> {
    const { code } = params;
    const originalCode = code;

    let fixedCode = originalCode;
    let changed = false;

    // Rule 1: ensure newline at end
    if (!fixedCode.endsWith("\n")) {
      fixedCode = fixedCode + "\n";
      changed = true;
    }

    // Rule 2: append a TODO if not present
    if (!fixedCode.includes("TODO")) {
      fixedCode =
        fixedCode +
        "\n# TODO: Review this function for edge cases (auto-suggested by Code Reviewer)\n";
      changed = true;
    }

    if (!changed) {
      // if code already has newline + TODO, no fix suggested
      return null;
    }

    return {
      originalCode,
      fixedCode,
      diff: "" // we can ignore diff for now or fill later
    };
  }
}
