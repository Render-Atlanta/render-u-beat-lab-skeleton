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

  it("does not mistake 'bouncier' for the bounce style", () => {
    expect(parseFastPath("make it bouncier")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT });
  });

  it("returns null for empty or unrecognized input", () => {
    expect(parseFastPath("")).toBeNull();
    expect(parseFastPath("   ")).toBeNull();
    expect(parseFastPath("teach me to juggle")).toBeNull();
  });
});
