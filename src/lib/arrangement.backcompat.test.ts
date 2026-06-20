import { describe, expect, it } from "vitest";
import {
  createBeatLabProject,
  exportProjectJson,
  importProjectJson,
} from "./arrangement";
import { createDefaultSequencerState } from "./patternState";

describe("project import backward-compat", () => {
  it("defaults a missing pattern.bassGuitar lane to empty for pre-bassGuitar projects", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    // Simulate a project exported before the bassGuitar lane existed.
    delete parsed.sequencer.pattern.bassGuitar;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.pattern.bassGuitar).toEqual(
      Array.from({ length: 16 }, () => false),
    );
  });
});
