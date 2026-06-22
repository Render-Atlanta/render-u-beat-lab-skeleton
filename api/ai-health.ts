import { getJsonProviderStatus } from "./_aiProvider.js";
import {
  createRequestId,
  logApiEvent,
  methodNotAllowed,
  setRequestIdHeader,
  type ApiRequest,
  type ApiResponse,
} from "./_http.js";

export default function handler(
  request: ApiRequest,
  response: ApiResponse,
): void {
  const requestId = createRequestId();
  setRequestIdHeader(response, requestId);

  if (request.method !== "GET") {
    logApiEvent(requestId, "ai.health.method_not_allowed");
    methodNotAllowed(response);
    return;
  }

  const status = getJsonProviderStatus();
  logApiEvent(requestId, "ai.health.read", {
    provider: status.provider,
    configured: status.configured,
  });
  response.status(200).json({
    provider: status.provider,
    configured: status.configured,
    requestId,
  });
}
