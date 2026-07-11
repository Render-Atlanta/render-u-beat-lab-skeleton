import { describe, expect, it } from "vitest";
import { summarizePatternChange } from "./beatCoach";
import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { serializePattern } from "./patternState";
import { countActiveSteps } from "./patterns";
import { GOLDEN_BEAT_STYLE_FIXTURES } from "../test/beatStyleFixtures";

// Amapiano is the workshop rebuild target — validated by property spec in
// beatStyles.amapiano.test.ts, not by an exact-grid lock the attendee can't guess.
const REVIEWED_STYLE_IDS = (Object.keys(BEAT_STYLES) as BeatStyleId[]).filter(
  (id) => id !== "amapiano",
);

it("ships a tasteful clap and 808 default in every style", () => {
  for (const styleId of REVIEWED_STYLE_IDS) {
    const pattern = BEAT_STYLES[styleId].pattern;
    expect(pattern.clap.some(Boolean), `${styleId} clap`).toBe(true);
    expect(pattern["808"].some(Boolean), `${styleId} 808`).toBe(true);
  }
});

describe("golden beat style fixtures", () => {
  it("covers every production style with one expected fixture", () => {
    expect(Object.keys(GOLDEN_BEAT_STYLE_FIXTURES).sort()).toEqual(
      REVIEWED_STYLE_IDS.slice().sort(),
    );
  });

  it("locks each default style pattern to a reviewed serialized grid", () => {
    for (const styleId of REVIEWED_STYLE_IDS) {
      const fixture = GOLDEN_BEAT_STYLE_FIXTURES[styleId];
      if (!fixture) throw new Error(`missing golden fixture for ${styleId}`);

      expect(serializePattern(BEAT_STYLES[styleId].pattern)).toBe(
        fixture.serializedPattern,
      );
      expect(countActiveSteps(BEAT_STYLES[styleId].pattern)).toBe(
        fixture.hitCount,
      );
    }
  });

  it("locks each default style to its key teaching summary", () => {
    for (const styleId of REVIEWED_STYLE_IDS) {
      const fixture = GOLDEN_BEAT_STYLE_FIXTURES[styleId];
      if (!fixture) throw new Error(`missing golden fixture for ${styleId}`);
      const summary = summarizePatternChange(
        styleId,
        BEAT_STYLES[styleId].pattern,
      );

      expect(summary.densityLevel).toBe(fixture.densityLevel);
      expect(summary.densitySummary).toBe(fixture.densitySummary);
      expect(summary.pocketSummary).toBe(fixture.pocketSummary);
    }
  });
});
