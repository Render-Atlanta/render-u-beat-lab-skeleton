import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import {
  formatStyleReferenceMeta,
  getStyleReferences,
  STYLE_REFERENCES,
} from "./styleReferences";

describe("style references", () => {
  it("provides at least three reference tracks for every style", () => {
    for (const styleId of Object.keys(BEAT_STYLES) as BeatStyleId[]) {
      const references = getStyleReferences(styleId);

      expect(references.length).toBeGreaterThanOrEqual(3);
      for (const reference of references) {
        expect(reference.title).not.toBe("");
        expect(reference.artist).not.toBe("");
        expect(reference.bpm).toBeGreaterThanOrEqual(60);
        expect(reference.sourceUrl).toMatch(/^https:\/\//);
        expect(reference.profile.length).toBeGreaterThan(20);
      }
    }
  });

  it("anchors trap to Atlanta half-time references", () => {
    expect(STYLE_REFERENCES.trap.map((reference) => reference.title)).toEqual([
      "Mask Off",
      "Lemonade",
      "Bad and Boujee",
      "March Madness",
    ]);
    expect(STYLE_REFERENCES.trap.every((reference) => reference.feelBpm)).toBe(true);
  });

  it("formats reference tempo metadata for the UI", () => {
    expect(formatStyleReferenceMeta(STYLE_REFERENCES.trap[0])).toBe(
      "150 BPM / feels 75 · light swing",
    );
    expect(formatStyleReferenceMeta(STYLE_REFERENCES.pop[0])).toBe(
      "103 BPM · straight swing",
    );
  });
});
