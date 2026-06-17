import { describe, expect, it } from "vitest";
import {
  countClassificationsNeedingCorrection,
  getMicCaptureErrorMessage,
  getMicStateCopy,
} from "./captureAnalysis";

describe("capture analysis helpers", () => {
  it("maps microphone errors to workshop-friendly copy", () => {
    expect(getMicCaptureErrorMessage({ code: "permission-denied" })).toContain(
      "permission was denied",
    );
    expect(getMicCaptureErrorMessage({ code: "no-device" })).toContain(
      "No microphone",
    );
    expect(getMicCaptureErrorMessage(new Error("boom"))).toContain(
      "sequencer is still ready",
    );
  });

  it("summarizes idle, recording, captured, and error states", () => {
    expect(getMicStateCopy({ status: "idle" })).toContain("Nothing uploads");
    expect(getMicStateCopy({ status: "recording" })).toContain("Listening");
    expect(getMicStateCopy({ status: "error", message: "No mic" })).toBe("No mic");

    expect(
      getMicStateCopy({
        status: "captured",
        result: {} as never,
        preview: {
          envelope: [],
          thresholds: {
            noiseFloor: 0,
            peakLevel: 0,
            threshold: 0,
            minRise: 0,
          },
          rawHits: [{ atMs: 0 } as never, { atMs: 100 } as never],
          rawStepHits: [],
          cleanedHits: [{ atMs: 0 } as never],
          rawGrid: [],
          cleanedGrid: [],
        },
        classifications: [
          { needsCorrection: true } as never,
          { needsCorrection: false } as never,
        ],
      }),
    ).toBe("Detected 1 cleaned hits from 2 raw hits. 1 need a lane check.");
  });

  it("counts classifications that need correction", () => {
    expect(
      countClassificationsNeedingCorrection([
        { needsCorrection: true },
        { needsCorrection: false },
        { needsCorrection: true },
      ]),
    ).toBe(2);
  });
});
