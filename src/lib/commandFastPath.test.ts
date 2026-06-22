import { describe, expect, it } from "vitest";
import { parseFastPath, TEMPO_STEP_BPM, SWING_STEP_PERCENT } from "./commandFastPath";

describe("parseFastPath", () => {
  it("maps style names to selectStyle", () => {
    expect(parseFastPath("make it trap")).toEqual({ kind: "selectStyle", styleId: "trap" });
    expect(parseFastPath("New Orleans bounce please")).toEqual({ kind: "selectStyle", styleId: "bounce" });
    expect(parseFastPath("give me some house")).toEqual({ kind: "selectStyle", styleId: "house" });
  });

  it("maps slow/fast to a relative tempo nudge", () => {
    expect(parseFastPath("slow it down")).toEqual({ kind: "setTempo", mode: "relative", deltaBpm: -TEMPO_STEP_BPM });
    expect(parseFastPath("half-time")).toEqual({ kind: "setTempo", mode: "relative", deltaBpm: -TEMPO_STEP_BPM });
    expect(parseFastPath("faster")).toEqual({ kind: "setTempo", mode: "relative", deltaBpm: TEMPO_STEP_BPM });
  });

  it("maps swing phrases, preferring 'less' over the generic match", () => {
    expect(parseFastPath("more swing")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT });
    expect(parseFastPath("less swing")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT });
    expect(parseFastPath("tighter")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT });
  });

  it("maps lane mute and density phrases", () => {
    expect(parseFastPath("mute the hats")).toEqual({
      kind: "setLaneMute",
      instrumentId: "hat",
      muted: true,
    });
    expect(parseFastPath("bring back the snare")).toEqual({
      kind: "setLaneMute",
      instrumentId: "snare",
      muted: false,
    });
    expect(parseFastPath("make the hats busier")).toEqual({
      kind: "adjustLaneDensity",
      instrumentId: "hat",
      direction: "busier",
    });
    expect(parseFastPath("make the bass line busier")).toEqual({
      kind: "adjustLaneDensity",
      instrumentId: "bassGuitar",
      direction: "busier",
    });
    expect(parseFastPath("mute bass guitar")).toEqual({
      kind: "setLaneMute",
      instrumentId: "bassGuitar",
      muted: true,
    });
    expect(parseFastPath("make it less busy")).toEqual({
      kind: "adjustLaneDensity",
      instrumentId: "hat",
      direction: "sparser",
    });
  });

  it("maps fill phrases", () => {
    expect(parseFastPath("add a fill")).toEqual({ kind: "addFill" });
    expect(parseFastPath("add a fill to the beat")).toEqual({ kind: "addFill" });
    expect(parseFastPath("give me a snare roll")).toEqual({ kind: "addFill" });
  });

  it("maps arrangement length phrases", () => {
    expect(parseFastPath("make the main section 8 bars")).toEqual({
      kind: "setSectionBars",
      sectionId: "main",
      bars: 8,
    });
    expect(parseFastPath("make the intro two bars")).toEqual({
      kind: "setSectionBars",
      sectionId: "intro",
      bars: 2,
    });
    expect(parseFastPath("extend the beat")).toEqual({
      kind: "adjustArrangementBars",
      sectionId: "main",
      deltaBars: 4,
    });
    expect(parseFastPath("add 4 bars to the outro")).toEqual({
      kind: "adjustArrangementBars",
      sectionId: "outro",
      deltaBars: 4,
    });
    expect(parseFastPath("shorten the outro")).toEqual({
      kind: "adjustArrangementBars",
      sectionId: "outro",
      deltaBars: -1,
    });
    expect(parseFastPath("remove two bars from the intro")).toEqual({
      kind: "adjustArrangementBars",
      sectionId: "intro",
      deltaBars: -2,
    });
    expect(parseFastPath("double the arrangement")).toEqual({
      kind: "doubleArrangement",
    });
  });

  it("does not mistake 'bouncier' for the bounce style", () => {
    expect(parseFastPath("make it bouncier")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT });
  });

  it("returns null for empty or unrecognized input", () => {
    expect(parseFastPath("")).toBeNull();
    expect(parseFastPath("   ")).toBeNull();
    expect(parseFastPath("teach me to juggle")).toBeNull();
  });
});
