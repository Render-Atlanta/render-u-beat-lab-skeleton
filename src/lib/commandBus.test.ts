import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyArrangementAction,
  describeAction,
  isArrangementAction,
} from "./commandBus";
import { createDefaultArrangement, getArrangementBarCount } from "./arrangement";
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

  it("mutes and unmutes a lane without clearing its pattern", () => {
    const start = createDefaultSequencerState("trap");
    const muted = applyAction(
      { kind: "setLaneMute", instrumentId: "hat", muted: true },
      start,
    );
    const unmuted = applyAction(
      { kind: "setLaneMute", instrumentId: "hat", muted: false },
      muted,
    );

    expect(muted.laneMutes.hat).toBe(true);
    expect(muted.pattern.hat).toEqual(start.pattern.hat);
    expect(unmuted.laneMutes.hat).toBe(false);
  });

  it("adjustLaneDensity can add and remove hits on a lane", () => {
    const start = createDefaultSequencerState("trap");
    const busy = applyAction(
      { kind: "adjustLaneDensity", instrumentId: "hat", direction: "busier" },
      start,
    );
    const sparse = applyAction(
      { kind: "adjustLaneDensity", instrumentId: "hat", direction: "sparser" },
      busy,
    );

    expect(busy.pattern.hat.filter(Boolean).length).toBeGreaterThan(
      start.pattern.hat.filter(Boolean).length,
    );
    expect(sparse.pattern.hat.filter(Boolean).length).toBeLessThan(
      busy.pattern.hat.filter(Boolean).length,
    );
  });

  it("addFill places a resolving fill into the loop", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction({ kind: "addFill" }, start);
    expect(next.pattern.openHat[15]).toBe(true);
    expect(next.stepVelocities.openHat[15]).toBe(2);
  });

  it("leaves the sequencer unchanged for arrangement actions", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction(
      { kind: "setSectionBars", sectionId: "main", bars: 8 },
      start,
    );
    expect(next).toBe(start);
  });

  it("unknown returns the same state reference unchanged", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction({ kind: "unknown", reason: "no-match" }, start);
    expect(next).toBe(start);
  });
});

describe("applyArrangementAction", () => {
  it("sets a section to an exact bar count", () => {
    const start = createDefaultArrangement();
    const next = applyArrangementAction(
      { kind: "setSectionBars", sectionId: "main", bars: 8 },
      start,
    );

    expect(next.sections.find((section) => section.id === "main")?.bars).toBe(8);
    expect(isArrangementAction({ kind: "setSectionBars", sectionId: "main", bars: 8 })).toBe(true);
  });

  it("extends and doubles arrangement bars with normal clamping", () => {
    const start = createDefaultArrangement();
    const extended = applyArrangementAction(
      { kind: "adjustArrangementBars", sectionId: "main", deltaBars: 4 },
      start,
    );
    const doubled = applyArrangementAction({ kind: "doubleArrangement" }, extended);

    expect(extended.sections.find((section) => section.id === "main")?.bars).toBe(5);
    expect(getArrangementBarCount(doubled)).toBe(16);
  });
});

describe("describeAction", () => {
  it("names the style on selectStyle", () => {
    expect(describeAction({ kind: "selectStyle", styleId: "bounce" })).toContain(BEAT_STYLES.bounce.name);
  });

  it("gives a friendly hint on unknown", () => {
    expect(describeAction({ kind: "unknown", reason: "x" }).toLowerCase()).toContain("try");
  });

  it("describes lane edits", () => {
    expect(describeAction({ kind: "setLaneMute", instrumentId: "hat", muted: true })).toContain("Muted");
    expect(describeAction({ kind: "addFill" })).toContain("fill");
  });

  it("describes arrangement edits", () => {
    expect(describeAction({ kind: "setSectionBars", sectionId: "main", bars: 8 })).toContain("Main");
    expect(describeAction({ kind: "doubleArrangement" })).toContain("Doubled");
  });
});
