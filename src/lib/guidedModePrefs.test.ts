import { describe, expect, it } from "vitest";
import { readGuidedPref, writeGuidedPref } from "./guidedModePrefs";

function createFakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const throwingStorage = {
  getItem: () => {
    throw new Error("storage blocked");
  },
  setItem: () => {
    throw new Error("storage blocked");
  },
} as unknown as Storage;

describe("readGuidedPref", () => {
  it("defaults a first-time visitor (no stored key) to guided", () => {
    expect(readGuidedPref(createFakeStorage())).toBe("guided");
  });

  it("returns a stored free preference", () => {
    expect(readGuidedPref(createFakeStorage({ "beatlab.guidedMode": "free" }))).toBe(
      "free",
    );
  });

  it("returns a stored guided preference", () => {
    expect(
      readGuidedPref(createFakeStorage({ "beatlab.guidedMode": "guided" })),
    ).toBe("guided");
  });

  it("treats an unknown stored value as guided", () => {
    expect(
      readGuidedPref(createFakeStorage({ "beatlab.guidedMode": "garbage" })),
    ).toBe("guided");
  });

  it("falls back to guided when storage throws", () => {
    expect(readGuidedPref(throwingStorage)).toBe("guided");
  });

  it("falls back to guided when storage is null", () => {
    expect(readGuidedPref(null)).toBe("guided");
  });
});

describe("writeGuidedPref", () => {
  it("round-trips through storage", () => {
    const storage = createFakeStorage();
    writeGuidedPref("free", storage);
    expect(readGuidedPref(storage)).toBe("free");
    writeGuidedPref("guided", storage);
    expect(readGuidedPref(storage)).toBe("guided");
  });

  it("swallows storage errors instead of throwing", () => {
    expect(() => writeGuidedPref("free", throwingStorage)).not.toThrow();
    expect(() => writeGuidedPref("free", null)).not.toThrow();
  });
});
