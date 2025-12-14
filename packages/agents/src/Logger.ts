import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const REGION = process.env.AWS_REGION || "us-east-1";
const LOG_GROUP = process.env.CW_LOG_GROUP || "/code-reviewer/reviews";
const LOG_STREAM =
  process.env.CW_LOG_STREAM ||
  `code-reviewer-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

const client = new CloudWatchLogsClient({ region: REGION });

let initialized = false;
let nextSequenceToken: string | undefined = undefined;
let initPromise: Promise<void> | null = null;

async function initIfNeeded() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      try {
        await client.send( new CreateLogGroupCommand({ logGroupName: LOG_GROUP }));
        console.log("[CW] Created log group:", LOG_GROUP);
      } catch (err: any) {
        if (err?.name !== "ResourceAlreadyExistsException") {
          console.warn("[CW] CreateLogGroup warning:", err?.message ?? err);
        }
      }

      // create log stream
      try {
        await client.send(
          new CreateLogStreamCommand({
            logGroupName: LOG_GROUP,
            logStreamName: LOG_STREAM
          })
        );
        console.log("[CW] Created log stream:", LOG_STREAM);
      } catch (err: any) {
        if (err?.name !== "ResourceAlreadyExistsException") {
          console.warn("[CW] CreateLogStream warning:", err?.message ?? err);
        }
      }

      initialized = true;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export interface ReviewLogEvent {
  runId: string;
  stepType: "agent" | "fix" | "eval";
  agentName?: string;
  filePath?: string;
  codeLength?: number;
  durationMs?: number;
  commentsCount?: number;
  timestampMs: number;

  // evaluation fields
  evalOverallScore?: number;
  evalRiskLevel?: string;
  evalSummary?: string;

  payload?: any;
}

export async function logReviewEvent(
  event: ReviewLogEvent
): Promise<void> {
  if (!LOG_GROUP || !LOG_STREAM) {
    console.log("[CW] LOG_GROUP or LOG_STREAM not set; skipping CW log");
    return;
  }

  try {
    await initIfNeeded();

    const message = JSON.stringify(event);
    const timestamp = Date.now();

    const cmd = new PutLogEventsCommand({
      logGroupName: LOG_GROUP,
      logStreamName: LOG_STREAM,
      logEvents: [ { message, timestamp } ],
      sequenceToken: nextSequenceToken
    });

    const resp = await client.send(cmd);
    nextSequenceToken = resp.nextSequenceToken;
  } catch (err: any) {
    // Handle InvalidSequenceToken
    if (err?.name === "InvalidSequenceTokenException") {
      console.warn("[CW] InvalidSequenceToken; will reset token:", err.message);
      nextSequenceToken = undefined;
      return;
    }
    console.error("[CW] Failed to put log events:", err);
  }
}
