export interface AiHealthStatus {
  provider: string;
  configured: boolean;
  requestId: string;
}

export type AiHealthState =
  | { status: "checking" }
  | { status: "ready"; provider: string; requestId: string }
  | { status: "missing"; provider: string; requestId: string }
  | { status: "error" };

export async function requestAiHealth(
  fetcher: typeof fetch = fetch,
): Promise<AiHealthState> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher("/api/ai-health", {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { status: "error" };
    }

    const payload: unknown = await response.json();
    if (!isAiHealthStatus(payload)) {
      return { status: "error" };
    }
    return payload.configured
      ? {
        status: "ready",
        provider: payload.provider,
        requestId: payload.requestId,
      }
      : {
        status: "missing",
        provider: payload.provider,
        requestId: payload.requestId,
      };
  } catch {
    return { status: "error" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isAiHealthStatus(value: unknown): value is AiHealthStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { provider?: unknown }).provider === "string" &&
    typeof (value as { configured?: unknown }).configured === "boolean" &&
    typeof (value as { requestId?: unknown }).requestId === "string"
  );
}
