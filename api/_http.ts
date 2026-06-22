export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  setHeader?(name: string, value: string): void;
  status(code: number): {
    json(payload: unknown): void;
  };
}

export function readJsonBody(request: ApiRequest): unknown {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return undefined;
    }
  }
  return request.body;
}

export function methodNotAllowed(response: ApiResponse): void {
  response.status(405).json({ error: "method-not-allowed" });
}

export function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now().toString(36)}`;
}

export function setRequestIdHeader(response: ApiResponse, requestId: string): void {
  response.setHeader?.("x-request-id", requestId);
}

export function logApiEvent(
  requestId: string,
  event: string,
  fields: Record<string, string | number | boolean> = {},
): void {
  console.info(JSON.stringify({ event, requestId, ...fields }));
}
