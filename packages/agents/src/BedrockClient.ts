import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({region: process.env.AWS_REGION || "us-west-2"});

export async function BedrockChat(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  modelId?: string;
}): Promise<string | null> {
  const {
    system,
    user,
    temperature = 0.2,
    maxTokens = 4096,
    modelId = process.env.BEDROCK_MODEL_ID
  } = params;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: user
          }
        ]
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });

  try {
    const response = await client.send(command);
    const raw = Buffer.from(response.body!).toString("utf8");
    const data = JSON.parse(raw);

    // output lives in content[0].text
    return data.content?.[0]?.text?.trim() ?? null;

  } catch (err) {
    console.error("Bedrock Claude API error:", err);
    return null;
  }
}
