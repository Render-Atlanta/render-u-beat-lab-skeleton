import { createJsonProvider } from "./_aiProvider.js";
import {
  methodNotAllowed,
  readJsonBody,
  type ApiRequest,
  type ApiResponse,
} from "./_http.js";
import { COMMAND_ACTION_RESPONSE_SCHEMA } from "./_schemas.js";

interface CommandBody {
  text?: unknown;
  context?: unknown;
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  if (request.method !== "POST") {
    methodNotAllowed(response);
    return;
  }

  const rawBody = readJsonBody(request);
  const body =
    typeof rawBody === "object" && rawBody !== null ? (rawBody as CommandBody) : {};
  if (typeof body.text !== "string" || !body.text.trim()) {
    response.status(400).json({ action: { kind: "unknown", reason: "empty-command" } });
    return;
  }

  const provider = createJsonProvider();
  if (!provider) {
    response.status(200).json({ action: { kind: "unknown", reason: "ai-not-configured" } });
    return;
  }

  try {
    const payload = await provider.generateJson({
      systemInstruction: COMMAND_SYSTEM_PROMPT,
      prompt: JSON.stringify({ text: body.text, context: body.context }),
      schema: COMMAND_ACTION_RESPONSE_SCHEMA,
      temperature: 0.1,
    });
    const action = getAction(payload);
    response.status(200).json({
      action: isCommandAction(action)
        ? action
        : { kind: "unknown", reason: "invalid-ai-action" },
    });
  } catch {
    response.status(200).json({ action: { kind: "unknown", reason: "ai-command-failed" } });
  }
}

function getAction(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  return (payload as { action?: unknown }).action;
}

const STYLE_IDS = new Set([
  "trap",
  "crunk",
  "drill",
  "rnb",
  "pop",
  "afrobeats",
  "amapiano",
  "house",
  "bounce",
]);

function isCommandAction(action: unknown): boolean {
  if (typeof action !== "object" || action === null) {
    return false;
  }
  const value = action as Record<string, unknown>;
  switch (value.kind) {
    case "selectStyle":
      return typeof value.styleId === "string" && STYLE_IDS.has(value.styleId);
    case "setTempo":
      return (
        (value.mode === "absolute" &&
          typeof value.bpm === "number" &&
          Number.isFinite(value.bpm) &&
          value.bpm >= 60 &&
          value.bpm <= 180) ||
        (value.mode === "relative" &&
          typeof value.deltaBpm === "number" &&
          Number.isFinite(value.deltaBpm))
      );
    case "setSwing":
      return (
        (value.mode === "absolute" &&
          typeof value.swingPercent === "number" &&
          Number.isFinite(value.swingPercent) &&
          value.swingPercent >= 0 &&
          value.swingPercent <= 30) ||
        (value.mode === "relative" &&
          typeof value.deltaPercent === "number" &&
          Number.isFinite(value.deltaPercent))
      );
    case "unknown":
      return typeof value.reason === "string";
    default:
      return false;
  }
}

const COMMAND_SYSTEM_PROMPT = [
  "You translate beginner beat-making requests into one JSON action.",
  "Return only the provided schema. Do not explain.",
  "Supported styles: trap, crunk, drill, rnb, pop, afrobeats, amapiano, house, bounce.",
  "Supported actions: selectStyle, setTempo, setSwing, unknown.",
  "Use unknown for requests about generating audio, editing unsupported lanes, or anything outside the action schema.",
  "Clamp absolute tempo requests to 60-180 BPM and swing to 0-30 percent.",
].join(" ");
