import type { AiBeatContext } from "./aiBeatContext";
import { isCommandAction, type CommandAction } from "./commandActions";

export interface CommandClientRequest {
  text: string;
  context: AiBeatContext;
}

export async function requestCommandAction(
  request: CommandClientRequest,
  fetcher: typeof fetch = fetch,
): Promise<CommandAction> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { kind: "unknown", reason: "command-endpoint-error" };
    }

    const payload: unknown = await response.json();
    const action = getActionPayload(payload);
    return isCommandAction(action)
      ? action
      : { kind: "unknown", reason: "invalid-command-action" };
  } catch {
    return { kind: "unknown", reason: "command-network-error" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getActionPayload(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  return (payload as { action?: unknown }).action;
}
