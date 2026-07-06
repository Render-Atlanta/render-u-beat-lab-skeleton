import { describe, expect, it } from "vitest";
import { GAME_TRACK_SPECS } from "./gameTracks";
import { buildRhythmChart, LANE_OF, serializeRhythmChart } from "./rhythmChart";

const airport = () => GAME_TRACK_SPECS.find((s) => s.slug === "airport")!;

describe("buildRhythmChart", () => {
  it("emits a chart with the stage header fields", () => {
    const chart = buildRhythmChart(airport());
    expect(chart.slug).toBe("airport");
    expect(chart.styleId).toBe("afrobeats");
    expect(chart.bpm).toBe(108);
    expect(chart.lanes).toBe(4);
    expect(chart.loopBars).toBeGreaterThanOrEqual(4);
    expect(chart.durationMs).toBeGreaterThan(0);
    expect(chart.notes.length).toBeGreaterThan(0);
  });

  it("maps every note into a valid 4-lane index", () => {
    const chart = buildRhythmChart(airport());
    for (const n of chart.notes) {
      expect(n.lane, JSON.stringify(n)).toBeGreaterThanOrEqual(0);
      expect(n.lane).toBeLessThanOrEqual(3);
      expect(LANE_OF[n.snd]).toBe(n.lane);
    }
  });

  it("produces notes in strictly non-decreasing time within [0, durationMs]", () => {
    const chart = buildRhythmChart(airport());
    let prev = -1;
    for (const n of chart.notes) {
      expect(n.timeMs).toBeGreaterThanOrEqual(prev);
      expect(n.timeMs).toBeLessThanOrEqual(chart.durationMs);
      prev = n.timeMs;
    }
  });

  it("dedupes instruments that share a lane at the same time into one note", () => {
    const chart = buildRhythmChart(airport());
    const seen = new Set<string>();
    for (const n of chart.notes) {
      const key = `${n.lane}@${n.timeMs}`;
      expect(seen.has(key), `duplicate lane/time ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("carries a scale degree on pitched-lane (lane 3) notes at least once", () => {
    const chart = buildRhythmChart(airport());
    expect(chart.notes.some((n) => n.lane === 3 && typeof n.degree === "number")).toBe(true);
  });

  it("times notes to match the offline WAV renderer's swing (offbeats LATER)", () => {
    const chart = buildRhythmChart(airport());
    const stepSec = 60 / chart.bpm / 4;
    const swing = Math.max(0, Math.min(0.5, chart.swing));
    const barMs = 16 * stepSec * 1000;
    // WAV-consistent in-bar onsets: styleRender.ts delays odd (offbeat) steps by swing.
    // `barMs` is appended as the wrapped step-0 downbeat: the bar length is fractional,
    // so a downbeat rounded down by <1ms reduces (via % barMs) to ~barMs, not ~0.
    const allowedOnsets = [
      ...Array.from({ length: 16 }, (_, i) => (i + (i % 2 === 1 ? swing : 0)) * stepSec * 1000),
      barMs,
    ];
    const nearest = (offset: number) =>
      Math.min(...allowedOnsets.map((onset) => Math.abs(offset - onset)));

    for (const n of chart.notes) {
      const offset = n.timeMs % barMs;
      expect(nearest(offset), JSON.stringify(n)).toBeLessThanOrEqual(2);
    }

    // At least one note must land on an ODD-step (offbeat, +swing) onset — proving
    // swing is applied in the LATE direction, not early.
    const oddOnsets = allowedOnsets.filter((_, i) => i % 2 === 1);
    const nearestOdd = (offset: number) =>
      Math.min(...oddOnsets.map((onset) => Math.abs(offset - onset)));
    expect(chart.notes.some((n) => nearestOdd(n.timeMs % barMs) <= 2)).toBe(true);
  });

  it("builds a valid chart for every game-track spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const chart = buildRhythmChart(spec);
      expect(chart.notes.length, spec.slug).toBeGreaterThan(0);
      expect(JSON.parse(serializeRhythmChart(chart)).slug).toBe(spec.slug);
    }
  });
});

describe("serializeRhythmChart", () => {
  it("round-trips to an object whose notes match the built chart", () => {
    const chart = buildRhythmChart(GAME_TRACK_SPECS[0]);
    const parsed = JSON.parse(serializeRhythmChart(chart));
    expect(parsed.notes.length).toBe(chart.notes.length);
    expect(parsed.durationMs).toBe(chart.durationMs);
    expect(parsed.lanes).toBe(4);
  });
});
