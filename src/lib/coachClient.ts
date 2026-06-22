import type { AiBeatContext } from "./aiBeatContext";
import { isCommandAction, type CommandAction } from "./commandActions";

export interface CoachClientRequest {
  question: string;
  context: AiBeatContext;
}

export interface CoachClientResponse {
  answer: string;
  source: "ai" | "fallback";
  action?: CommandAction;
}

export async function requestCoachAnswer(
  request: CoachClientRequest,
  fetcher: typeof fetch = fetch,
): Promise<CoachClientResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      return fallbackCoachAnswer(request.context);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof (payload as { answer?: unknown }).answer === "string"
    ) {
      const action = (payload as { action?: unknown }).action;
      return {
        answer: (payload as { answer: string }).answer,
        source: "ai",
        ...(isCommandAction(action) ? { action } : {}),
      };
    }
  } catch {
    return fallbackCoachAnswer(request.context);
  } finally {
    clearTimeout(timeoutId);
  }

  return fallbackCoachAnswer(request.context);
}

export function fallbackCoachAnswer(context: AiBeatContext): CoachClientResponse {
  return {
    answer: `${context.tryThis} Right now the beat is ${context.densityLevel} with ${context.activeSteps} active hits.`,
    source: "fallback",
  };
}
