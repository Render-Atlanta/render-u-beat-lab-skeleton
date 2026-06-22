import { describe, expect, it } from "vitest";
import { createAiBeatContext } from "./aiBeatContext";
import { requestCoachAnswer } from "./coachClient";
import { createDefaultSequencerState } from "./patternState";

const context = createAiBeatContext(createDefaultSequencerState("trap"));

describe("requestCoachAnswer", () => {
  it("returns an AI answer from the endpoint", async () => {
    const response = await requestCoachAnswer(
      { question: "What next?", context },
      async () =>
        new Response(
          JSON.stringify({
            answer: "Add hats before the snare.",
            action: { kind: "adjustLaneDensity", instrumentId: "hat", direction: "busier" },
          }),
          { status: 200 },
        ),
    );

    expect(response).toEqual({
      answer: "Add hats before the snare.",
      source: "ai",
      action: { kind: "adjustLaneDensity", instrumentId: "hat", direction: "busier" },
    });
  });

  it("drops invalid AI actions while keeping the answer", async () => {
    const response = await requestCoachAnswer(
      { question: "What next?", context },
      async () =>
        new Response(
          JSON.stringify({
            answer: "Try a simple hat pattern.",
            action: { kind: "delete-project" },
          }),
          { status: 200 },
        ),
    );

    expect(response).toEqual({
      answer: "Try a simple hat pattern.",
      source: "ai",
    });
  });

  it("falls back to grounded local coaching when the endpoint fails", async () => {
    const response = await requestCoachAnswer(
      { question: "What next?", context },
      async () => new Response("Nope", { status: 503 }),
    );

    expect(response.source).toBe("fallback");
    expect(response.answer).toContain(context.tryThis);
  });
});
