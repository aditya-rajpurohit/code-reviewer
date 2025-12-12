import { ReviewRequest, ReviewResult } from "@code-reviewer/types";
import { StaticReviewAgent } from "./StaticReviewAgent";
import { FixAgent } from "./FixAgent";

export class ReviewOrchestrator {
  constructor(
    private staticReviewAgent: StaticReviewAgent,
    private fixAgent: FixAgent
  ) {}

  async reviewWithFix(req: ReviewRequest): Promise<ReviewResult> {
    const baseResult = await this.staticReviewAgent.review(req);

    const fix = await this.fixAgent.suggestFix({
      code: req.code,
      filePath: req.filePath
    });

    if (!fix) {
      return baseResult;
    }

    return {
      ...baseResult,
      fix
    };
  }
}
