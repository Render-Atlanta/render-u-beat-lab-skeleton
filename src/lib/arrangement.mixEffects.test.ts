import { describe, expect, it } from "vitest";
import {
  createBeatLabProject,
  exportProjectJson,
  importProjectJson,
} from "./arrangement";
import { createDefaultSequencerState } from "./patternState";

describe("project mix effects import/export", () => {
  it("defaults missing sequencer.mixEffects to dry for backward-compat", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.sequencer.mixEffects;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.mixEffects).toEqual(
      createDefaultSequencerState("trap").mixEffects,
    );
  });

  it("round-trips non-default mix effects through project JSON", () => {
    const baseSequencer = createDefaultSequencerState("trap");
    const project = createBeatLabProject({
      sequencer: {
        ...baseSequencer,
        mixEffects: { space: 0.4, echo: 0.2 },
      },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.mixEffects).toEqual({ space: 0.4, echo: 0.2 });
  });
});
