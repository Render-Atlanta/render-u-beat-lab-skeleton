import {
  createOpenAiProvider,
  getOpenAiProviderStatus,
} from "./_openAiProvider.js";

export interface GenerateJsonInput {
  systemInstruction: string;
  prompt: string;
  schema: unknown;
  temperature?: number;
}

export interface JsonProvider {
  generateJson(input: GenerateJsonInput): Promise<unknown>;
}

export interface JsonProviderStatus {
  provider: string;
  configured: boolean;
  model?: string;
  baseUrl?: string;
  reason?: string;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function createJsonProvider(): JsonProvider | null {
  const provider = (process.env.AI_PROVIDER ?? process.env.LLM_PROVIDER ?? "gemini")
    .toLowerCase()
    .trim();
  if (provider === "gemini" || provider === "google") {
    return createGeminiProvider();
  }
  if (
    provider === "openai" ||
    provider === "openai-compatible" ||
    provider === "compatible"
  ) {
    return createOpenAiProvider();
  }
  return null;
}

export function getJsonProviderStatus(): JsonProviderStatus {
  const provider = (process.env.AI_PROVIDER ?? process.env.LLM_PROVIDER ?? "gemini")
    .toLowerCase()
    .trim();
  if (provider === "gemini" || provider === "google") {
    return {
      provider: "gemini",
      configured: Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      model: process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL,
    };
  }
  if (
    provider === "openai" ||
    provider === "openai-compatible" ||
    provider === "compatible"
  ) {
    return getOpenAiProviderStatus(provider);
  }
  return {
    provider: provider || "unknown",
    configured: false,
    reason: "unsupported-provider",
  };
}

function createGeminiProvider(): JsonProvider | null {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const model = process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return {
    async generateJson(input: GenerateJsonInput): Promise<unknown> {
      const response = await callGemini({
        apiKey,
        input,
        model,
        schemaMode: "responseFormat",
      });
      const okResponse = response.ok
        ? response
        : await callGemini({
          apiKey,
          input,
          model,
          schemaMode: "responseSchema",
        });
      if (!okResponse.ok) {
        throw new Error(`Gemini request failed: ${okResponse.status}`);
      }
      const payload = await okResponse.json();
      return JSON.parse(extractGeminiText(payload));
    },
  };
}

async function callGemini({
  apiKey,
  input,
  model,
  schemaMode,
}: {
  apiKey: string;
  input: GenerateJsonInput;
  model: string;
  schemaMode: "responseFormat" | "responseSchema";
}): Promise<Response> {
  const generationConfig =
    schemaMode === "responseFormat"
      ? {
        temperature: input.temperature ?? 0.2,
        responseFormat: {
          text: {
            mimeType: "APPLICATION_JSON",
            schema: input.schema,
          },
        },
      }
      : {
        temperature: input.temperature ?? 0.2,
        responseMimeType: "application/json",
        responseSchema: input.schema,
      };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: input.systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: input.prompt }],
            },
          ],
          generationConfig,
        }),
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Gemini response was not an object.");
  }
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    throw new Error("Gemini response did not include candidates.");
  }
  if (candidates.length === 0) {
    throw new Error("Gemini response did not include any candidates.");
  }
  const first = candidates[0] as { content?: { parts?: Array<{ text?: string }> } };
  const text = first.content?.parts?.find((part) => typeof part.text === "string")?.text;
  if (!text) {
    throw new Error("Gemini response did not include text.");
  }
  return text;
}
