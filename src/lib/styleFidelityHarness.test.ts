import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { renderPatternToPcm } from "./styleRender";
import { extractStyleFeatures, FIDELITY_DRUM_LANES, scoreStyleFidelity, styleSimilarity } from "./styleFidelity";
import { STYLE_GOLDENS, STYLE_PROFILE_STATS } from "./styleProfiles.generated";

const kit = loadKitFromDisk();
// Amapiano is the workshop rebuild target — its pattern is intentionally
// carved out, so it can't satisfy the exact audio-fidelity/genre goldens;
// validated instead by beatStyles.amapiano.test.ts.
const ids = (Object.keys(BEAT_STYLES) as BeatStyleId[]).filter((id) => id !== "amapiano");

describe("style-fidelity harness", () => {
  it("drift guard: each canonical render matches its committed golden", () => {
    for (const id of ids) {
      const { score, nearestGenre } = scoreStyleFidelity(BEAT_STYLES[id], kit);
      expect(score, `drift on ${id} — run: npm run generate:style-profiles`).toBeGreaterThanOrEqual(0.98);
      expect(nearestGenre).toBe(id);
    }
  });

  it("genre distinction: each genre is most similar to its own golden", () => {
    for (const id of ids) {
      const f = extractStyleFeatures(
        BEAT_STYLES[id].pattern, BEAT_STYLES[id], renderPatternToPcm(BEAT_STYLES[id].pattern, BEAT_STYLES[id], kit, FIDELITY_DRUM_LANES),
      );
      const ranked = ids
        .map((h) => ({ h, sim: styleSimilarity(f, STYLE_GOLDENS[h], STYLE_PROFILE_STATS) }))
        .sort((a, b) => b.sim - a.sim);
      expect(ranked[0].h).toBe(id);
    }
  });

  it("edit-sanity: flooding trap with 16th hats lowers its trap score", () => {
    const base = scoreStyleFidelity(BEAT_STYLES.trap, kit).score;
    const editedStyle = {
      ...BEAT_STYLES.trap,
      pattern: {
        ...BEAT_STYLES.trap.pattern,
        hat: new Array(16).fill(true),
      },
    };
    const edited = scoreStyleFidelity(editedStyle, kit).score;
    expect(edited).toBeLessThan(base);
    expect(edited).toBeLessThan(0.97);
  });

  it("tempo/swing edit moves the meter: altered bpm/swing scores strictly below canonical", () => {
    const canonicalScore = scoreStyleFidelity(BEAT_STYLES.trap, kit).score;
    const editedStyle = {
      ...BEAT_STYLES.trap,
      bpm: 60,
      swing: 0.3,
    };
    const editedScore = scoreStyleFidelity(editedStyle, kit).score;
    // eslint-disable-next-line no-console
    console.log(`canonical trap score: ${canonicalScore.toFixed(4)}, edited tempo/swing score: ${editedScore.toFixed(4)}`);
    expect(editedScore).toBeLessThan(canonicalScore);
  });
});
