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
        new Response(JSON.stringify({ answer: "Add hats before the snare." }), {
          status: 200,
        }),
    );

    expect(response).toEqual({
      answer: "Add hats before the snare.",
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
