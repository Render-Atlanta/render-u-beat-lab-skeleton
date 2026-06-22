import { createJsonProvider } from "./_aiProvider.js";
import {
  createRequestId,
  logApiEvent,
  methodNotAllowed,
  readJsonBody,
  setRequestIdHeader,
  type ApiRequest,
  type ApiResponse,
} from "./_http.js";
import { getAction, isCommandAction } from "./_commandAction.js";
import { COMMAND_ACTION_RESPONSE_SCHEMA } from "./_schemas.js";

interface CommandBody {
  text?: unknown;
  context?: unknown;
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  const requestId = createRequestId();
  setRequestIdHeader(response, requestId);
  if (request.method !== "POST") {
    logApiEvent(requestId, "ai.command.method_not_allowed");
    methodNotAllowed(response);
    return;
  }

  const rawBody = readJsonBody(request);
  const body =
    typeof rawBody === "object" && rawBody !== null ? (rawBody as CommandBody) : {};
  if (typeof body.text !== "string" || !body.text.trim()) {
    logApiEvent(requestId, "ai.command.empty");
    response.status(400).json({ action: { kind: "unknown", reason: "empty-command" } });
    return;
  }

  const provider = createJsonProvider();
  if (!provider) {
    logApiEvent(requestId, "ai.command.not_configured");
    response.status(200).json({ action: { kind: "unknown", reason: "ai-not-configured" } });
    return;
  }

  try {
    logApiEvent(requestId, "ai.command.start");
    const payload = await provider.generateJson({
      systemInstruction: COMMAND_SYSTEM_PROMPT,
      prompt: JSON.stringify({ text: body.text, context: body.context }),
      schema: COMMAND_ACTION_RESPONSE_SCHEMA,
      temperature: 0.1,
    });
    const action = getAction(payload);
    logApiEvent(requestId, "ai.command.complete", {
      valid: isCommandAction(action),
      kind:
        typeof action === "object" &&
        action !== null &&
        typeof (action as { kind?: unknown }).kind === "string"
          ? (action as { kind: string }).kind
          : "invalid",
    });
    response.status(200).json({
      action: isCommandAction(action)
        ? action
        : { kind: "unknown", reason: "invalid-ai-action" },
    });
  } catch {
    logApiEvent(requestId, "ai.command.failed");
    response.status(200).json({ action: { kind: "unknown", reason: "ai-command-failed" } });
  }
}

const COMMAND_SYSTEM_PROMPT = [
  "You translate beginner beat-making requests into one JSON action.",
  "Return only the provided schema. Do not explain.",
  "Supported styles: trap, crunk, drill, rnb, pop, afrobeats, amapiano, house, bounce.",
  "Supported lanes: kick, snare, hat, openHat, clap, 808, bassGuitar, melody.",
  "Supported arrangement sections: intro, main, variation, outro.",
  "Supported actions: selectStyle, setTempo, setSwing, setLaneMute, adjustLaneDensity, addFill, setSectionBars, adjustArrangementBars, doubleArrangement, unknown.",
  "Use setLaneMute for mute/unmute lane requests, adjustLaneDensity for busier/sparser lane requests, and addFill for one-bar fill requests.",
  "If the user asks for a busier or sparser beat without naming a lane, use the hat lane.",
  "Use setSectionBars for exact section length requests, adjustArrangementBars for extend/shorten requests, and doubleArrangement for double-the-song or double-section requests.",
  "If the user asks to extend the beat without naming a section, use sectionId main and deltaBars 4.",
  "Use unknown for requests about generating audio files or anything outside the action schema.",
  "Clamp absolute tempo requests to 60-180 BPM and swing to 0-30 percent.",
  "Clamp arrangement bars to 1-16.",
].join(" ");
