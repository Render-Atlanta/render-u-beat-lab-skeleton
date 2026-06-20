import { describe, expect, it } from "vitest";
import { waveformToLevelFrames } from "./waveformToLevelFrames";

describe("waveformToLevelFrames", () => {
  it("returns zero rms/peak for silence", () => {
    const frames = waveformToLevelFrames(new Float32Array(22050), 22050, 50);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every((f) => f.rms === 0 && f.peak === 0)).toBe(true);
  });

  it("reports full-scale peak and rms ~1 for a DC-full buffer", () => {
    const samples = new Float32Array(22050).fill(1);
    const frames = waveformToLevelFrames(samples, 22050, 50);
    expect(frames[0].peak).toBeCloseTo(1, 5);
    expect(frames[0].rms).toBeCloseTo(1, 5);
  });

  it("spaces frames by frameMs and stamps atMs", () => {
    const frames = waveformToLevelFrames(new Float32Array(22050), 22050, 50);
    expect(frames[0].atMs).toBe(0);
    expect(frames[1].atMs).toBe(50);
  });

  it("returns an empty array for empty input", () => {
    expect(waveformToLevelFrames(new Float32Array(0), 22050, 50)).toEqual([]);
  });
});
