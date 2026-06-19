import { describe, expect, it } from "vitest";
import {
  createDefaultLaneVolumes,
  deserializeLaneVolumes,
  normalizeLaneVolume,
  normalizeLaneVolumes,
  serializeLaneVolumes,
  updateLaneVolume,
} from "./laneVolumes";

describe("laneVolumes", () => {
  it("normalizes out-of-range values into 0..1.5", () => {
    expect(normalizeLaneVolume(-1)).toBe(0);
    expect(normalizeLaneVolume(2)).toBe(1.5);
    expect(normalizeLaneVolume(0.75)).toBe(0.75);
    expect(normalizeLaneVolume("bad")).toBe(1);
  });

  it("fills missing lanes with the default volume", () => {
    expect(normalizeLaneVolumes({ kick: 0.5 })).toEqual({
      ...createDefaultLaneVolumes(),
      kick: 0.5,
    });
  });

  it("serializes and deserializes lane volumes in instrument order", () => {
    const volumes = updateLaneVolume(createDefaultLaneVolumes(), "snare", 0.5);
    const serialized = serializeLaneVolumes(volumes);

    expect(serialized).toBe("1,0.5,1,1,1,1,1");
    expect(deserializeLaneVolumes(serialized)).toEqual(volumes);
  });

  it("loads legacy six-lane volume URLs with melody at the default volume", () => {
    expect(deserializeLaneVolumes("1,0.5,1,1,1,0.75")).toEqual({
      ...createDefaultLaneVolumes(),
      snare: 0.5,
      "808": 0.75,
    });
  });

  it("rejects malformed serialized lane volumes", () => {
    expect(deserializeLaneVolumes("1,2,3")).toBeNull();
    expect(deserializeLaneVolumes("a,b,c,d,e,f")).toBeNull();
  });
});
