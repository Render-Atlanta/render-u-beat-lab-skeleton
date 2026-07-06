// src/lib/rhythmView.test.ts
import { describe, expect, it } from "vitest";
import { isNoteVisible, keyToLane, noteProgress } from "./rhythmView";

describe("noteProgress", () => {
  it("is 0 at spawn, 1 at the judge line, 0.5 halfway", () => {
    expect(noteProgress(2050, 0, 2050)).toBeCloseTo(0);
    expect(noteProgress(500, 500, 2050)).toBeCloseTo(1);
    expect(noteProgress(1025, 0, 2050)).toBeCloseTo(0.5);
  });
});

describe("isNoteVisible", () => {
  it("is false before spawn, true in the window, false well past the line", () => {
    expect(isNoteVisible(3000, 0, 2050, 190)).toBe(false); // not spawned yet
    expect(isNoteVisible(500, 0, 2050, 190)).toBe(true);   // falling
    expect(isNoteVisible(500, 900, 2050, 190)).toBe(false); // past line + good window
  });
});

describe("keyToLane", () => {
  const keys = ["D", "F", "J", "K"];
  it("maps game keys case-insensitively and rejects others", () => {
    expect(keyToLane("d", keys)).toBe(0);
    expect(keyToLane("K", keys)).toBe(3);
    expect(keyToLane("x", keys)).toBeNull();
  });
});
