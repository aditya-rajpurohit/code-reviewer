import { ReviewRequest, ReviewResult, FixResult, ReviewComment, EvaluateResult } from "@code-reviewer/types";
import { logReviewEvent } from "./Logger";

export class Orchestrator {
  constructor(
    private agents: Array<{ review(req: ReviewRequest): Promise<ReviewResult> }>,
    private fixAgent: {
      suggestFix(params: {
        code: string;
        filePath?: string;
      }): Promise<FixResult | null>;
    },
    private evaluateAgent?: {
      evaluate(params: {
        code: string;
        comments: ReviewComment[];
        fix?: FixResult | null;
      }): Promise<EvaluateResult | null>;
    }
  ) {}

  async reviewWithFix(req: ReviewRequest): Promise<ReviewResult> {

    const { code, filePath } = req;
    const codeLength = code.length;
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    console.log("========== Review Orchestrator: start ==========");
    console.log("File:", filePath || "local");
    console.log("Code length:", codeLength, "chars");

    const allComments: ReviewComment[] = [];
    
    // 1) Run all review agents
    for (const agent of this.agents) {
      const name = agent.constructor?.name || "UnknownAgent";
      console.log(`--> Running agent: ${name}`);

      const start = Date.now();
      const result = await agent.review(req);
      const duration = Date.now() - start;

      const count = result.comments?.length || 0; 
      console.log(`<-- Agent ${name} finished in ${duration}ms, comments: ${count}`);

      if (count > 0) {
        (result.comments as any[]).forEach((c, idx) => {
          const msg =
            c.message && c.message.length > 120
              ? c.message.slice(0, 120) + " ..."
              : c.message;
          console.log(
            `   [${idx + 1}] [${c.type}] line ${c.lineStart}-${c.lineEnd} from ${
              c.sourceAgent || name
            } (priority=${c.priority ?? "?"}): ${msg}`
          );
        });
      }

      if (result.comments?.length) {
        allComments.push(...(result.comments as any));
      }
      
      // log per agent
        void logReviewEvent({
          runId,
          stepType: "agent",
          agentName: agent.constructor?.name || "UnknownAgent",
          filePath,
          codeLength,
          durationMs: duration,
          commentsCount: result.comments?.length,
          timestampMs: Date.now(),
          payload: {
            commentTypes: result.comments.map((c) => c.type),
            lines: result.comments.map((c) => ({
              type: c.type,
              lineStart: c.lineStart,
              lineEnd: c.lineEnd
            }))
          }
        });

        console.log();
    }

    // 2) Fill in priority if missing & sort
    for (const c of allComments as any[]) {
      if (typeof c.priority !== "number") {
        c.priority =
          c.type === "security"
            ? 100
            : c.type === "bug"
            ? 80
            : c.type === "style"
            ? 20
            : 10;
      }
    }

    allComments.sort((a: any, b: any) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) return pb - pa;
      return (a.lineStart || 0) - (b.lineStart || 0);
    });

    console.log(
      `Aggregated comments: ${allComments.length} (after merge + sort)\n`
    );

    // 3) Run FixAgent
    console.log("--> Running fix agent");
    const fixStart = Date.now();
    const fix = await this.fixAgent.suggestFix({
      code: req.code,
      filePath: req.filePath
    });
    const fixDuration = Date.now() - fixStart;

    if (fix) {
      console.log(
        `<-- Fix agent proposed changes in ${fixDuration}ms, fixed length: ${fix.fixedCode.length} chars`
      );
    } else {
      console.log(
        `<-- Fix agent did not propose changes (${fixDuration}ms, code may be OK)`
      );
    }

    // log fix agent
    void logReviewEvent({
      runId,
      stepType: "fix",
      agentName: this.fixAgent.constructor?.name || "FixAgent",
      filePath,
      codeLength,
      durationMs: fixDuration,
      commentsCount: allComments.length,
      timestampMs: Date.now(),
      payload: { hadFix: !!fix }
    });

    // 4) Run Evaluate Agent
    let evaluateResult: EvaluateResult | null = null;
    if (this.evaluateAgent) {
      console.log("--> Running eval agent");
      
      const evalStart = Date.now();
      evaluateResult = await this.evaluateAgent.evaluate({
        code: req.code,
        comments: allComments,
        fix: fix ?? null
      });
      const evalDuration = Date.now() - evalStart;

      if (evaluateResult) {
        console.log(`<-- Eval agent finished in ${evalDuration}ms: overallScore=${evaluateResult.overallScore}, riskLevel=${evaluateResult.riskLevel}`);
        console.log("    Eval summary:", evaluateResult.summary);
        console.log("    Key findings:", evaluateResult.keyFindings.join(" | "));
      } else {
        console.log(`<-- Eval agent returned no result (${evalDuration}ms, skipping)`);
      }

      void logReviewEvent({
        runId,
        stepType: "eval",
        agentName: this.evaluateAgent.constructor?.name || "EvaluateAgent",
        filePath,
        codeLength,
        durationMs: evalDuration,
        commentsCount: allComments.length,
        timestampMs: Date.now(),
        evalOverallScore: evaluateResult?.overallScore,
        evalRiskLevel: evaluateResult?.riskLevel,
        evalSummary: evaluateResult?.summary,
        payload: { keyFindings: evaluateResult?.keyFindings ?? [] }
      });

    }

    console.log("========== Review Orchestrator: end ==========\n");

    return {
      comments: allComments,
      fix: fix ?? undefined,
      evaluation: evaluateResult ?? undefined
    };
  }
}
