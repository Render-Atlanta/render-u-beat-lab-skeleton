import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  createDefaultSequencerState,
  deserializePattern,
  readSequencerStateFromParams,
  serializePattern,
  togglePatternStep,
  writeSequencerStateToParams,
} from "./patternState";
import { GOLDEN_BEAT_STYLE_FIXTURES } from "../test/beatStyleFixtures";

describe("pattern state helpers", () => {
  it("serializes and deserializes a 4-lane pattern", () => {
    const pattern = BEAT_STYLES.trap.pattern;
    const serialized = serializePattern(pattern);

    expect(serialized).toBe(GOLDEN_BEAT_STYLE_FIXTURES.trap.serializedPattern);
    expect(deserializePattern(serialized)).toEqual(pattern);
  });

  it("rejects malformed serialized patterns", () => {
    expect(deserializePattern("1010")).toBeNull();
    expect(deserializePattern("0000000000000000.0000000000000000")).toBeNull();
    expect(
      deserializePattern("000000000000000x.0000000000000000.0000000000000000.0000000000000000"),
    ).toBeNull();
  });

  it("toggles one grid cell without mutating the original pattern", () => {
    const state = createDefaultSequencerState("pop");
    const nextPattern = togglePatternStep(state.pattern, "kick", 1);

    expect(state.pattern.kick[1]).toBe(false);
    expect(nextPattern.kick[1]).toBe(true);
  });

  it("round-trips sequencer state through URL params", () => {
    const state = createDefaultSequencerState("afrobeats");
    const params = writeSequencerStateToParams({
      ...state,
      bpm: 106,
      swing: 0.12,
      pattern: togglePatternStep(state.pattern, "snare", 3),
    });

    expect(readSequencerStateFromParams(params)).toEqual({
      styleId: "afrobeats",
      bpm: 106,
      swing: 0.12,
      pattern: togglePatternStep(state.pattern, "snare", 3),
    });
  });

  it("falls back to the requested style defaults when URL data is invalid", () => {
    const state = readSequencerStateFromParams(
      new URLSearchParams("style=drill&bpm=400&swing=-4&pattern=nope"),
    );

    expect(state).toEqual({
      styleId: "drill",
      bpm: 180,
      swing: 0,
      pattern: BEAT_STYLES.drill.pattern,
    });
  });

  it("rejects style query values from the prototype chain", () => {
    const state = readSequencerStateFromParams(
      new URLSearchParams("style=__proto__"),
    );

    expect(state).toEqual(createDefaultSequencerState("trap"));
  });

  it("accepts Amapiano as a URL-requested style", () => {
    const state = readSequencerStateFromParams(new URLSearchParams("style=amapiano"));

    expect(state).toEqual(createDefaultSequencerState("amapiano"));
  });
});
