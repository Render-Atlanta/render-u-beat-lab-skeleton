import { createJsonProvider } from "./_aiProvider.js";
import {
  methodNotAllowed,
  readJsonBody,
  type ApiRequest,
  type ApiResponse,
} from "./_http.js";
import { COACH_RESPONSE_SCHEMA } from "./_schemas.js";

interface CoachBody {
  question?: unknown;
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
    typeof rawBody === "object" && rawBody !== null ? (rawBody as CoachBody) : {};
  if (typeof body.question !== "string" || !body.question.trim()) {
    response.status(400).json({ answer: "Ask a beat question first." });
    return;
  }

  const provider = createJsonProvider();
  if (!provider) {
    response.status(200).json({ answer: fallbackAnswer(body.context) });
    return;
  }

  try {
    const payload = await provider.generateJson({
      systemInstruction: COACH_SYSTEM_PROMPT,
      prompt: JSON.stringify({ question: body.question, context: body.context }),
      schema: COACH_RESPONSE_SCHEMA,
      temperature: 0.35,
    });
    const answer = getAnswer(payload);
    response.status(200).json({ answer: answer ?? fallbackAnswer(body.context) });
  } catch {
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
].join(" ");
