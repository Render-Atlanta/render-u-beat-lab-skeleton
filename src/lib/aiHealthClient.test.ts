import { describe, expect, it } from "vitest";
import { requestAiHealth } from "./aiHealthClient";

describe("requestAiHealth", () => {
  it("maps configured providers to ready state", async () => {
    const status = await requestAiHealth(
      async () =>
        new Response(
          JSON.stringify({
            provider: "gemini",
            configured: true,
            requestId: "req-1",
          }),
          { status: 200 },
        ),
    );

    expect(status).toEqual({
      status: "ready",
      provider: "gemini",
      requestId: "req-1",
    });
  });

  it("maps unconfigured providers to missing state", async () => {
    const status = await requestAiHealth(
      async () =>
        new Response(
          JSON.stringify({
            provider: "openai",
            configured: false,
            requestId: "req-2",
          }),
          { status: 200 },
        ),
    );

    expect(status).toEqual({
      status: "missing",
      provider: "openai",
      requestId: "req-2",
    });
  });

  it("falls back to error on endpoint failure", async () => {
    const status = await requestAiHealth(
      async () => new Response("Nope", { status: 500 }),
    );

    expect(status).toEqual({ status: "error" });
  });
});
