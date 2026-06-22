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
import { createDefaultLaneMutes } from "./laneMutes";
import {
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
} from "./stepPitch";
import { createDefaultBassGuitarStepPitches } from "./bassGuitarPitch";
import { createDefaultStepVelocities } from "./stepVelocity";
import { normalizeMixEffects } from "./mixEffects";
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
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[0] = 2;
    stepVelocities.hat[2] = 0;
    const params = writeSequencerStateToParams({
      ...state,
      bpm: 106,
      swing: 0.12,
      pattern: togglePatternStep(state.pattern, "snare", 3),
      laneVolumes: { ...state.laneVolumes, hat: 0.5 },
      stepVelocities,
    });

    expect(params.get("vel")).toBe(
      "2111111111111111.1111111111111111.1101111111111111.1111111111111111.1111111111111111.1111111111111111.1111111111111111.1111111111111111",
    );
    expect(readSequencerStateFromParams(params)).toEqual({
      styleId: "afrobeats",
      bpm: 106,
      swing: 0.12,
      pattern: togglePatternStep(state.pattern, "snare", 3),
      laneVolumes: { ...createDefaultLaneVolumes(), hat: 0.5 },
      laneMutes: createDefaultLaneMutes(),
      sampleKitId: "classic",
      mixEffects: normalizeMixEffects(),
      stepVelocities,
      bassStepPitches: createDefaultBassStepPitches(),
      bassGuitarStepPitches: createDefaultBassGuitarStepPitches(),
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

  it("round-trips lane mutes through URL params and omits them when none are set", () => {
    const state = createDefaultSequencerState("trap");

    // No mutes → the param is omitted entirely.
    expect(writeSequencerStateToParams(state).has("mute")).toBe(false);

    const muted = { ...state, laneMutes: { ...state.laneMutes, snare: true } };
    const params = writeSequencerStateToParams(muted);
    expect(params.get("mute")).toBe("01000000");
    expect(readSequencerStateFromParams(params).laneMutes).toEqual(muted.laneMutes);
  });

  it("round-trips mix effects through URL params and omits dry defaults", () => {
    const state = createDefaultSequencerState("trap");

    expect(writeSequencerStateToParams(state).has("fx")).toBe(false);

    const effected = { ...state, mixEffects: { space: 0.35, echo: 0.2 } };
    const params = writeSequencerStateToParams(effected);

    expect(params.get("fx")).toBe("35,20");
    expect(readSequencerStateFromParams(params).mixEffects).toEqual(effected.mixEffects);
  });

  it("round-trips non-default sample kits through URL params and omits classic", () => {
    const state = createDefaultSequencerState("trap");

    expect(writeSequencerStateToParams(state).has("kit")).toBe(false);

    const withKit = { ...state, sampleKitId: "airy" as const };
    const params = writeSequencerStateToParams(withKit);

    expect(params.get("kit")).toBe("airy");
    expect(readSequencerStateFromParams(params).sampleKitId).toBe("airy");
  });

  it("defaults lane mutes when the mute param is missing or invalid", () => {
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap")).laneMutes,
    ).toEqual(createDefaultLaneMutes());
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap&mute=nope")).laneMutes,
    ).toEqual(createDefaultLaneMutes());
  });

  it("defaults lane volumes when the vol param is missing or invalid", () => {
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap")).laneVolumes,
    ).toEqual(createDefaultLaneVolumes());
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap&vol=bad")).laneVolumes,
    ).toEqual(createDefaultLaneVolumes());
  });

  it("defaults step velocities to normal when the vel param is missing or invalid", () => {
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap")).stepVelocities,
    ).toEqual(createDefaultStepVelocities());
    expect(
      readSequencerStateFromParams(new URLSearchParams("style=trap&vel=bad")).stepVelocities,
    ).toEqual(createDefaultStepVelocities());
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
      laneMutes: createDefaultLaneMutes(),
      sampleKitId: "classic",
      mixEffects: normalizeMixEffects(),
      stepVelocities: createDefaultStepVelocities(),
      bassStepPitches: createDefaultBassStepPitches(),
      bassGuitarStepPitches: createDefaultBassGuitarStepPitches(),
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

  it("defaults invalid kit query values to classic", () => {
    const state = readSequencerStateFromParams(
      new URLSearchParams("style=trap&kit=wrong"),
    );

    expect(state.sampleKitId).toBe("classic");
  });
});
