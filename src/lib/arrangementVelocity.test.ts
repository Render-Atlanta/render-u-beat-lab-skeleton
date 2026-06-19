import { describe, expect, it } from "vitest";
import {
  createBeatLabProject,
  exportProjectJson,
  importProjectJson,
} from "./arrangement";
import { createDefaultSequencerState } from "./patternState";
import { createDefaultStepVelocities } from "./stepVelocity";

describe("project JSON step velocities", () => {
  it("defaults missing sequencer.stepVelocities to normal for backward-compat", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.sequencer.stepVelocities;

    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.stepVelocities).toEqual(
      createDefaultStepVelocities(),
    );
  });

  it("round-trips non-default step velocities through project JSON", () => {
    const baseSequencer = createDefaultSequencerState("trap");
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[0] = 2;
    stepVelocities.hat[2] = 0;
    const project = createBeatLabProject({
      sequencer: {
        ...baseSequencer,
        stepVelocities,
      },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.stepVelocities).toEqual(stepVelocities);
  });
});
