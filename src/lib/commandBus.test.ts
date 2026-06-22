import { describe, expect, it } from "vitest";
import { applyAction, describeAction } from "./commandBus";
import { createDefaultSequencerState } from "./patternState";
import { getSwingPercent } from "./sequencerDomain";
import { BEAT_STYLES } from "./beatStyles";

describe("applyAction", () => {
  it("selectStyle loads that style's tempo and pattern", () => {
    const start = { ...createDefaultSequencerState("trap"), sampleKitId: "punchy" as const };
    const next = applyAction({ kind: "selectStyle", styleId: "bounce" }, start);
    expect(next.styleId).toBe("bounce");
    expect(next.bpm).toBe(BEAT_STYLES.bounce.bpm);
    expect(next.sampleKitId).toBe("punchy");
  });

  it("setTempo relative nudges and clamps to the 60-180 range", () => {
    const start = { ...createDefaultSequencerState("trap"), bpm: 178 };
    const next = applyAction({ kind: "setTempo", mode: "relative", deltaBpm: 8 }, start);
    expect(next.bpm).toBe(180);
  });

  it("setSwing relative changes swing by the given percent", () => {
    const start = createDefaultSequencerState("trap");
    const before = getSwingPercent(start.swing);
    const next = applyAction({ kind: "setSwing", mode: "relative", deltaPercent: 5 }, start);
    expect(getSwingPercent(next.swing)).toBe(Math.min(30, before + 5));
  });

  it("unknown returns the same state reference unchanged", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction({ kind: "unknown", reason: "no-match" }, start);
    expect(next).toBe(start);
  });
});

describe("describeAction", () => {
  it("names the style on selectStyle", () => {
    expect(describeAction({ kind: "selectStyle", styleId: "bounce" })).toContain(BEAT_STYLES.bounce.name);
  });

  it("gives a friendly hint on unknown", () => {
    expect(describeAction({ kind: "unknown", reason: "x" }).toLowerCase()).toContain("try");
  });
});
