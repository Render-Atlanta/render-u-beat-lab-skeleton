export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
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
