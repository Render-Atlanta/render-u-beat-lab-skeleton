import type {
  GenerateJsonInput,
  JsonProvider,
  JsonProviderStatus,
} from "./_aiProvider.js";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export function getOpenAiProviderStatus(provider: string): JsonProviderStatus {
  return {
    provider,
    configured: Boolean(process.env.OPENAI_API_KEY ?? process.env.OPENAI_COMPATIBLE_API_KEY),
    model: process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? DEFAULT_OPENAI_MODEL,
    baseUrl: normalizeBaseUrl(
      process.env.OPENAI_BASE_URL ??
        process.env.OPENAI_COMPATIBLE_BASE_URL ??
        DEFAULT_OPENAI_BASE_URL,
    ),
  };
}

export function createOpenAiProvider(): JsonProvider | null {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAI_COMPATIBLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  const model = process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const baseUrl = normalizeBaseUrl(
    process.env.OPENAI_BASE_URL ??
      process.env.OPENAI_COMPATIBLE_BASE_URL ??
      DEFAULT_OPENAI_BASE_URL,
  );
  return {
    async generateJson(input: GenerateJsonInput): Promise<unknown> {
      const response = await callOpenAi({
        apiKey,
        baseUrl,
        input,
        model,
        schemaMode: "jsonSchema",
      });
      const shouldFallbackToJsonObject =
        !response.ok &&
        (response.status === 400 ||
          response.status === 404 ||
          response.status === 415 ||
          response.status === 422);
      const okResponse = shouldFallbackToJsonObject
        ? await callOpenAi({
          apiKey,
          baseUrl,
          input,
          model,
          schemaMode: "jsonObject",
        })
        : response;
      if (!okResponse.ok) {
        throw new Error(`OpenAI-compatible request failed: ${okResponse.status}`);
      }
      const payload = await okResponse.json();
      return JSON.parse(extractOpenAiText(payload));
    },
  };
}

async function callOpenAi({
  apiKey,
  baseUrl,
  input,
  model,
  schemaMode,
}: {
  apiKey: string;
  baseUrl: string;
  input: GenerateJsonInput;
  model: string;
  schemaMode: "jsonSchema" | "jsonObject";
}): Promise<Response> {
  const responseFormat =
    schemaMode === "jsonSchema"
      ? {
        type: "json_schema",
        json_schema: {
          name: "beat_lab_response",
          strict: false,
          schema: input.schema,
        },
      }
      : { type: "json_object" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.systemInstruction },
          { role: "user", content: input.prompt },
        ],
        temperature: input.temperature ?? 0.2,
        response_format: responseFormat,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenAiText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("OpenAI-compatible response was not an object.");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenAI-compatible response did not include choices.");
  }
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((part) =>
        typeof part === "object" &&
        part !== null &&
        typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }
  throw new Error("OpenAI-compatible response did not include text.");
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
