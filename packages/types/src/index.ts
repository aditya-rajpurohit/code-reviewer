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

export interface ReviewResult {
  comments: ReviewComment[];
  // optional fix info; old code still works without it
  fix?: FixResult;
}
