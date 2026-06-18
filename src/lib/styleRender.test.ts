import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { RENDER_SAMPLE_RATE, renderPatternToPcm } from "./styleRender";

describe("renderPatternToPcm", () => {
  const kit = loadKitFromDisk();

  it("produces a deterministic, non-silent, bounded buffer", () => {
    const a = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const b = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(RENDER_SAMPLE_RATE); // > ~1s
    // byte-identical across runs
    expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
    // non-silent and peak-bounded
    const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it("renders longer buffers for slower tempos", () => {
    const fast = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const slow = renderPatternToPcm(BEAT_STYLES.crunk.pattern, BEAT_STYLES.crunk, kit);
    expect(slow.length).toBeGreaterThan(fast.length); // crunk 96bpm > trap 142bpm bar length
  });

  it("clamps negative swing to zero, matching engine behavior", () => {
    const negSwing = { ...BEAT_STYLES.trap, swing: -0.2 };
    const zeroSwing = { ...BEAT_STYLES.trap, swing: 0 };
    const neg = renderPatternToPcm(BEAT_STYLES.trap.pattern, negSwing, kit);
    const zero = renderPatternToPcm(BEAT_STYLES.trap.pattern, zeroSwing, kit);
    // Clamping negative swing to 0 must produce byte-identical output
    expect(Array.from(neg)).toEqual(Array.from(zero));
  });
});
