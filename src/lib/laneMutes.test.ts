import { describe, expect, it } from "vitest";
import { createDefaultLaneVolumes } from "./laneVolumes";
import {
  applyLaneMutes,
  createDefaultLaneMutes,
  deserializeLaneMutes,
  laneMutesAreDefault,
  serializeLaneMutes,
  toggleLaneMute,
} from "./laneMutes";

describe("laneMutes", () => {
  it("defaults to every lane unmuted", () => {
    const mutes = createDefaultLaneMutes();
    expect(laneMutesAreDefault(mutes)).toBe(true);
    expect(mutes.kick).toBe(false);
  });

  it("toggles a single lane without mutating the input", () => {
    const base = createDefaultLaneMutes();
    const muted = toggleLaneMute(base, "snare");

    expect(muted.snare).toBe(true);
    expect(base.snare).toBe(false);
    expect(laneMutesAreDefault(muted)).toBe(false);
    expect(toggleLaneMute(muted, "snare").snare).toBe(false);
  });

  it("forces muted lanes to silent volume while leaving others untouched", () => {
    const volumes = { ...createDefaultLaneVolumes(), kick: 1.4, hat: 0.5 };
    const mutes = toggleLaneMute(createDefaultLaneMutes(), "hat");

    const effective = applyLaneMutes(volumes, mutes);
    expect(effective.hat).toBe(0);
    expect(effective.kick).toBe(1.4);
  });

  it("round-trips through serialization", () => {
    const mutes = toggleLaneMute(
      toggleLaneMute(createDefaultLaneMutes(), "kick"),
      "808",
    );
    const serialized = serializeLaneMutes(mutes);

    expect(serialized).toBe("1000010");
    expect(deserializeLaneMutes(serialized)).toEqual(mutes);
  });

  it("rejects malformed or wrong-length mute strings", () => {
    expect(deserializeLaneMutes(null)).toBeNull();
    expect(deserializeLaneMutes("")).toBeNull();
    expect(deserializeLaneMutes("101")).toBeNull();
    expect(deserializeLaneMutes("100001x")).toBeNull();
  });
});
