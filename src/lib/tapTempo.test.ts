import { describe, expect, it } from "vitest";
import { MAX_BPM, MIN_BPM } from "./sequencerDomain";
import { TAP_TEMPO_RESET_GAP_MS, tapTempo } from "./tapTempo";

describe("tapTempo", () => {
  it("returns null until there are at least two taps", () => {
    expect(tapTempo([])).toBeNull();
    expect(tapTempo([1000])).toBeNull();
  });

  it("averages steady taps into the matching BPM", () => {
    // 500ms between taps → 120 BPM.
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    // 480ms between taps → 125 BPM after rounding.
    expect(tapTempo([0, 480, 960])).toBe(125);
  });

  it("averages only the most recent four taps", () => {
    // First two intervals are 800ms; the last three are 500ms. With the cap at
    // four taps only the trailing 500ms intervals count → 120 BPM.
    const fast = tapTempo([0, 800, 1600, 2100, 2600, 3100]);
    expect(fast).toBe(120);
  });

  it("starts a fresh measurement after a gap over two seconds", () => {
    const gap = TAP_TEMPO_RESET_GAP_MS + 1;
    // The first tap is stale; only the post-gap 500ms taps are measured.
    expect(tapTempo([0, gap, gap + 500, gap + 1000])).toBe(120);
    // A lone tap after the reset has no interval yet.
    expect(tapTempo([0, gap])).toBeNull();
  });

  it("keeps measuring across a gap of exactly two seconds", () => {
    // Exactly 2000ms apart is within the threshold (only >2s resets). 2000ms
    // intervals are 30 BPM, which clamps up to the 60 BPM floor.
    expect(tapTempo([0, TAP_TEMPO_RESET_GAP_MS, 2 * TAP_TEMPO_RESET_GAP_MS])).toBe(
      MIN_BPM,
    );
  });

  it("clamps very slow taps up to the BPM floor", () => {
    // 1500ms between taps → 40 BPM → clamped to 60.
    expect(tapTempo([0, 1500, 3000])).toBe(MIN_BPM);
  });

  it("clamps very fast taps down to the BPM ceiling", () => {
    // 200ms between taps → 300 BPM → clamped to 180.
    expect(tapTempo([0, 200, 400, 600])).toBe(MAX_BPM);
  });

  it("ignores non-finite timestamps", () => {
    expect(tapTempo([Number.NaN, 0, 500, 1000])).toBe(120);
  });
});
