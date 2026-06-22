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
import { COACH_RESPONSE_SCHEMA } from "./_schemas.js";

interface CoachBody {
  question?: unknown;
  context?: unknown;
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  const requestId = createRequestId();
  setRequestIdHeader(response, requestId);
  if (request.method !== "POST") {
    logApiEvent(requestId, "ai.coach.method_not_allowed");
    methodNotAllowed(response);
    return;
  }

  const rawBody = readJsonBody(request);
  const body =
    typeof rawBody === "object" && rawBody !== null ? (rawBody as CoachBody) : {};
  if (typeof body.question !== "string" || !body.question.trim()) {
    logApiEvent(requestId, "ai.coach.empty");
    response.status(400).json({ answer: "Ask a beat question first." });
    return;
  }

  const provider = createJsonProvider();
  if (!provider) {
    logApiEvent(requestId, "ai.coach.not_configured");
    response.status(200).json({ answer: fallbackAnswer(body.context) });
    return;
  }

  try {
    logApiEvent(requestId, "ai.coach.start");
    const payload = await provider.generateJson({
      systemInstruction: COACH_SYSTEM_PROMPT,
      prompt: JSON.stringify({ question: body.question, context: body.context }),
      schema: COACH_RESPONSE_SCHEMA,
      temperature: 0.35,
    });
    const answer = getAnswer(payload);
    const action = getAction(payload);
    logApiEvent(requestId, "ai.coach.complete", {
      action: isCommandAction(action),
      fallback: answer === null,
    });
    response.status(200).json({
      answer: answer ?? fallbackAnswer(body.context),
      ...(isCommandAction(action) ? { action } : {}),
    });
  } catch {
    logApiEvent(requestId, "ai.coach.failed");
    response.status(200).json({ answer: fallbackAnswer(body.context) });
  }
}

function getAnswer(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { answer?: unknown }).answer === "string"
  ) {
    const answer = (payload as { answer: string }).answer.trim();
    return answer.length > 0 ? answer : null;
  }
  return null;
}

function fallbackAnswer(context: unknown): string {
  if (
    typeof context === "object" &&
    context !== null &&
    typeof (context as { tryThis?: unknown }).tryThis === "string"
  ) {
    return (context as { tryThis: string }).tryThis;
  }
  return "Start by locking the kick and snare, then add hats until the groove moves.";
}

const COACH_SYSTEM_PROMPT = [
  "You are a beginner-friendly beat coach for Render U Beat Lab.",
  "Answer in one or two short sentences.",
  "Ground the answer in the supplied beat context: style, BPM, swing, active lanes, density, and coaching hints.",
  "Do not invent features the app does not have. Do not claim to hear audio.",
  "Prefer concrete grid advice a learner can try immediately.",
  "When your advice maps cleanly to one supported app action, include that action. Otherwise omit action.",
  "Supported arrangement actions are setSectionBars, adjustArrangementBars, and doubleArrangement for intro, main, variation, and outro.",
].join(" ");
