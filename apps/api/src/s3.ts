import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION;

export const s3Client = new S3Client({ region: AWS_REGION });

export interface UploadParams {
  sessionKeySeed: string;         // unique-ish per run
  source: "local" | "file" | "github";
  filePath?: string;
  fixedCode: string;
}

export async function uploadFixedCodeArtifact(
  params: UploadParams
): Promise<string | null> {
  const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

  if (!S3_BUCKET_NAME) {
    console.log("[S3] Skipping upload because S3_BUCKET_NAME is not set");
    return null;
  }

  const { sessionKeySeed, source, filePath, fixedCode } = params;

  const safeName = filePath?.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "fixed_code.txt";
  const key = `fixed/${source}/${sessionKeySeed}/${safeName}`;

  try {
    console.log("[S3] PutObject start:", { bucket: S3_BUCKET_NAME, key });
    
    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(fixedCode, "utf8"),
      ContentType: "text/plain; charset=utf-8"
    });

    await s3Client.send(cmd);
    console.log(`[S3] Uploaded fixed code artifact to s3://${S3_BUCKET_NAME}/${key}`);
    return key;
  } catch (err) {
    console.error("[S3] Failed to upload fixed code artifact:", err);
    return null;
  }
}
