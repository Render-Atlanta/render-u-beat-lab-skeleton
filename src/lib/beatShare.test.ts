import { describe, expect, it } from "vitest";
import { createDefaultSequencerState, writeSequencerStateToParams } from "./patternState";
import { updateSequencerStep, updateSequencerBassStepPitch } from "./sequencerDomain";
import {
  AUTOSAVE_STORAGE_KEY,
  decodeBeatParam,
  encodeBeatParam,
  readSharedSequencerState,
  readAutosavedSequencerState,
  readInitialSequencerStateFromSources,
  serializeBeat,
  writeAutosavedSequencerState,
} from "./beatShare";

describe("compact beat share serialization", () => {
  it("round-trips a full sequencer state through base64", () => {
    const base = createDefaultSequencerState("trap");
    const state = updateSequencerBassStepPitch(
      updateSequencerStep(
        {
          ...base,
          bpm: 136,
          swing: 0.14,
          laneVolumes: { ...base.laneVolumes, hat: 0.6 },
        },
        "kick",
        1,
      ),
      0,
      2,
    );

    const encoded = encodeBeatParam(state);

    expect(encoded).not.toContain(".");
    expect(decodeBeatParam(encoded)).toEqual(state);
  });

  it("uses the compact beat param before legacy params", () => {
    const compact = updateSequencerStep(createDefaultSequencerState("drill"), "kick", 1);
    const legacy = createDefaultSequencerState("pop");
    const params = writeSequencerStateToParams(legacy);
    params.set("beat", encodeBeatParam(compact));

    expect(readSharedSequencerState(params)).toEqual(compact);
  });

  it("keeps legacy param URLs working when beat is missing or invalid", () => {
    const legacy = updateSequencerStep(createDefaultSequencerState("rnb"), "snare", 1);
    const params = writeSequencerStateToParams(legacy);

    expect(readSharedSequencerState(params)).toEqual(legacy);
    params.set("beat", "not-valid-base64");
    expect(readSharedSequencerState(params)).toEqual(legacy);
  });

  it("serializes deterministic autosave payloads under the v1 key", () => {
    const state = createDefaultSequencerState("afrobeats");

    expect(AUTOSAVE_STORAGE_KEY).toBe("rubl-beat-v1");
    expect(serializeBeat(state)).toBe(serializeBeat(state));
  });

  it("writes and reads autosaved state from storage", () => {
    const storage = createMemoryStorage();
    const state = updateSequencerStep(createDefaultSequencerState("pop"), "kick", 1);

    writeAutosavedSequencerState(storage, state);

    expect(storage.getItem(AUTOSAVE_STORAGE_KEY)).toBe(serializeBeat(state));
    expect(readAutosavedSequencerState(storage)).toEqual(state);
  });

  it("restores legacy shared params before autosave", () => {
    const storage = createMemoryStorage();
    const autosaved = createDefaultSequencerState("trap");
    const legacy = updateSequencerStep(createDefaultSequencerState("rnb"), "snare", 1);
    writeAutosavedSequencerState(storage, autosaved);

    expect(
      readInitialSequencerStateFromSources(writeSequencerStateToParams(legacy), storage),
    ).toEqual(legacy);
  });

  it("restores compact beat params before legacy params and autosave", () => {
    const storage = createMemoryStorage();
    const autosaved = createDefaultSequencerState("trap");
    const legacy = createDefaultSequencerState("rnb");
    const compact = updateSequencerStep(createDefaultSequencerState("drill"), "kick", 1);
    const params = writeSequencerStateToParams(legacy);
    params.set("beat", encodeBeatParam(compact));
    writeAutosavedSequencerState(storage, autosaved);

    expect(readInitialSequencerStateFromSources(params, storage)).toEqual(compact);
  });

  it("restores autosave when no share params are present", () => {
    const storage = createMemoryStorage();
    const autosaved = updateSequencerStep(createDefaultSequencerState("pop"), "kick", 1);
    writeAutosavedSequencerState(storage, autosaved);

    expect(readInitialSequencerStateFromSources(new URLSearchParams(), storage)).toEqual(
      autosaved,
    );
  });

  it("ignores malformed autosave data", () => {
    const storage = createMemoryStorage();
    storage.setItem(AUTOSAVE_STORAGE_KEY, "bad");

    expect(readAutosavedSequencerState(storage)).toBeNull();
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
