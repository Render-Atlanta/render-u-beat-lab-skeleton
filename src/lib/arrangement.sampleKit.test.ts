import { describe, expect, it } from "vitest";
import {
  createBeatLabProject,
  exportProjectJson,
  importProjectJson,
} from "./arrangement";
import { createDefaultSequencerState } from "./patternState";

describe("project sample kit import/export", () => {
  it("defaults missing sequencer.sampleKitId to classic for backward-compat", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.sequencer.sampleKitId;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.sampleKitId).toBe("classic");
  });

  it("round-trips non-default sample kits through project JSON", () => {
    const project = createBeatLabProject({
      sequencer: {
        ...createDefaultSequencerState("trap"),
        sampleKitId: "punchy",
      },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.sampleKitId).toBe("punchy");
  });

  it("rejects invalid project sample kit ids", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    parsed.sequencer.sampleKitId = "wrong";

    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected import to fail for invalid sample kit");
    }
    expect(result.errors).toContain(
      "Sequencer sampleKitId must be classic, punchy, or airy.",
    );
  });
});
