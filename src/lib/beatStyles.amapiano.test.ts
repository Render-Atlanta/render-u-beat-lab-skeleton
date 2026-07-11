import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { countActiveSteps } from "./patterns";

describe("amapiano style (workshop rebuild target)", () => {
  const s = BEAT_STYLES.amapiano;
  it("keeps clap and 808 present", () => {
    expect(s.pattern.clap.some(Boolean)).toBe(true);
    expect(s.pattern["808"].some(Boolean)).toBe(true);
  });
  it("puts a kick on step 1 and keeps hats moving", () => {
    expect(s.pattern.kick[0]).toBeTruthy();
    expect(s.pattern.hat.some(Boolean)).toBe(true);
  });
  it("uses an amapiano-appropriate tempo and shuffle", () => {
    expect(s.bpm).toBeGreaterThanOrEqual(108);
    expect(s.bpm).toBeLessThanOrEqual(116);
    expect(s.swing).toBeGreaterThanOrEqual(0.1);
  });
  it("has a teachable density and a lesson", () => {
    const hits = countActiveSteps(s.pattern);
    expect(hits).toBeGreaterThanOrEqual(14);
    expect(hits).toBeLessThanOrEqual(28);
    expect(s.lesson.trim().length).toBeGreaterThan(0);
  });
});
