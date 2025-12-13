export type CommentType = "style" | "bug" | "security" | "info";

export interface ReviewComment {
  id: string;
  message: string;
  lineStart: number;
  lineEnd: number;
  type: CommentType;
}

export interface ReviewRequest {
  code: string;
  filePath?: string;
}

// New: the result of a fix operation
export interface FixResult {
  originalCode: string;
  fixedCode: string;
  diff: string; // unified diff text
}

export interface EvaluateResult {
  overallScore: number;
  correctness: number;
  security: number;
  style: number;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  keyFindings: string[];
}

export interface ReviewResult {
  comments: ReviewComment[];
  fix?: FixResult;
  evaluation?: EvaluateResult;
}
