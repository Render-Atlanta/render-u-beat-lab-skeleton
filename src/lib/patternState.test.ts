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
import { createDefaultLaneVolumes } from "./laneVolumes";
import {
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
} from "./stepPitch";
import { GOLDEN_BEAT_STYLE_FIXTURES } from "../test/beatStyleFixtures";

describe("pattern state helpers", () => {
  it("serializes and deserializes a seven-lane pattern", () => {
    const pattern = BEAT_STYLES.trap.pattern;
    const serialized = serializePattern(pattern);

    expect(serialized).toBe(GOLDEN_BEAT_STYLE_FIXTURES.trap.serializedPattern);
    expect(deserializePattern(serialized)).toEqual(pattern);
  });

  it("rejects malformed serialized patterns", () => {
    expect(deserializePattern("1010")).toBeNull();
    expect(
      deserializePattern("000000000000000x.0000000000000000.0000000000000000.0000000000000000.0000000000000000.0000000000000000"),
    ).toBeNull();
  });

  it("loads a legacy four-lane serialized pattern with empty new lanes", () => {
    const legacy = "1000000000000000.0000000000000000.1010101010101010.0000000000000000";
    const pattern = deserializePattern(legacy);
    expect(pattern).not.toBeNull();
    expect(pattern!.kick[0]).toBe(true);
    expect(pattern!.clap.every((s) => s === false)).toBe(true);
    expect(pattern!["808"].every((s) => s === false)).toBe(true);
    expect(pattern!.melody.every((s) => s === false)).toBe(true);
  });

  it("loads a six-lane serialized pattern with an empty melody lane", () => {
    const sixLane = [
      "1000000000000000",
      "0000100000000000",
      "1010101010101010",
      "0000000100000000",
      "0000100000000000",
      "1000000000000000",
    ].join(".");
    const pattern = deserializePattern(sixLane);

    expect(pattern).not.toBeNull();
    expect(pattern!.kick[0]).toBe(true);
    expect(pattern!.melody.every((s) => s === false)).toBe(true);
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
      laneVolumes: { ...state.laneVolumes, hat: 0.5 },
    });

    expect(readSequencerStateFromParams(params)).toEqual({
      styleId: "afrobeats",
      bpm: 106,
      swing: 0.12,
      pattern: togglePatternStep(state.pattern, "snare", 3),
      laneVolumes: { ...createDefaultLaneVolumes(), hat: 0.5 },
      bassStepPitches: createDefaultBassStepPitches(),
      melodyStepPitches: createDefaultMelodyStepPitches(),
    });
  });

  it("round-trips bass pitch data through URL params", () => {
    const state = createDefaultSequencerState("trap");
    const bassStepPitches = [...state.bassStepPitches];
    bassStepPitches[0] = 2;
    bassStepPitches[7] = 4;

    const params = writeSequencerStateToParams({
      ...state,
      bassStepPitches,
    });

    expect(readSequencerStateFromParams(params).bassStepPitches).toEqual(bassStepPitches);
  });

  it("round-trips melody pitch data through URL params", () => {
    const state = createDefaultSequencerState("trap");
    const melodyStepPitches = [...state.melodyStepPitches];
    melodyStepPitches[0] = 1;
    melodyStepPitches[4] = 3;

    const params = writeSequencerStateToParams({
      ...state,
      melodyStepPitches,
    });

    expect(params.get("melody")).toBe("1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0");
    expect(readSequencerStateFromParams(params).melodyStepPitches).toEqual(melodyStepPitches);
  });

  it("defaults lane volumes when the vol param is missing or invalid", () => {
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap")).laneVolumes,
    ).toEqual(createDefaultLaneVolumes());
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap&vol=bad")).laneVolumes,
    ).toEqual(createDefaultLaneVolumes());
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
      laneVolumes: createDefaultLaneVolumes(),
      bassStepPitches: createDefaultBassStepPitches(),
      melodyStepPitches: createDefaultMelodyStepPitches(),
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
