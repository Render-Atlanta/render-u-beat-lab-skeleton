import { describe, expect, it } from "vitest";
import { createDefaultSequencerState } from "./patternState";
import { createAiBeatContext } from "./aiBeatContext";
import { requestCommandAction } from "./commandClient";

const context = createAiBeatContext(createDefaultSequencerState("trap"));

describe("requestCommandAction", () => {
  it("returns a validated action from the endpoint payload", async () => {
    const action = await requestCommandAction(
      { text: "go bounce", context },
      async () =>
        new Response(
          JSON.stringify({ action: { kind: "selectStyle", styleId: "bounce" } }),
          { status: 200 },
        ),
    );

    expect(action).toEqual({ kind: "selectStyle", styleId: "bounce" });
  });

  it("falls back to unknown for malformed endpoint output", async () => {
    const action = await requestCommandAction(
      { text: "invent a genre", context },
      async () =>
        new Response(JSON.stringify({ action: { kind: "explode" } }), {
          status: 200,
        }),
    );

    expect(action).toEqual({
      kind: "unknown",
      reason: "invalid-command-action",
    });
  });
});
