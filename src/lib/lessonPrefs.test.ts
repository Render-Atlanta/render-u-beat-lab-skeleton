import { describe, expect, it } from "vitest";
import { readLessonPref, writeLessonPref } from "./lessonPrefs";
import { LESSONS } from "./lessons";

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
  removeItem: () => {
    throw new Error("storage blocked");
  },
} as unknown as Storage;

describe("readLessonPref", () => {
  it("returns null for a first-time visitor", () => {
    expect(readLessonPref(createFakeStorage())).toBeNull();
  });

  it("returns a stored, still-valid lesson id", () => {
    const id = LESSONS[0].id;
    expect(readLessonPref(createFakeStorage({ "beatlab.lesson": id }))).toBe(id);
  });

  it("treats an unknown/stale lesson id as null", () => {
    expect(
      readLessonPref(createFakeStorage({ "beatlab.lesson": "deleted-lesson" })),
    ).toBeNull();
  });

  it("falls back to null when storage throws or is absent", () => {
    expect(readLessonPref(throwingStorage)).toBeNull();
    expect(readLessonPref(null)).toBeNull();
  });
});

describe("writeLessonPref", () => {
  it("round-trips a lesson id and clears it on null", () => {
    const storage = createFakeStorage();
    const id = LESSONS[0].id;
    writeLessonPref(id, storage);
    expect(readLessonPref(storage)).toBe(id);
    writeLessonPref(null, storage);
    expect(readLessonPref(storage)).toBeNull();
  });

  it("swallows storage errors instead of throwing", () => {
    expect(() => writeLessonPref(LESSONS[0].id, throwingStorage)).not.toThrow();
    expect(() => writeLessonPref(null, null)).not.toThrow();
  });
});
