import { describe, expect, it } from "vitest";
import { GAME_TRACK_SPECS } from "../lib/gameTracks";
import type { DecodedKit } from "../lib/styleRender";
import { renderGameTrackWav } from "../lib/gameTracks";
import { decodeWav } from "../lib/wav";
import { createHitSfx, renderRhythmBed } from "./rhythmBed";

// A minimal decoded kit: each sampled lane a short non-silent buffer.
function fakeKit(): DecodedKit {
  const one = () => Float32Array.from([0.3, -0.2, 0.1]);
  return { kick: one(), snare: one(), clap: one(), hat: one(), openHat: one(), "808": one() } as DecodedKit;
}

// A fake BaseAudioContext exposing just the buffer APIs rhythmBed uses.
function fakeCtx(sampleRate = 22050) {
  return {
    sampleRate,
    createBuffer(_ch: number, length: number, sr: number) {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate: sr,
        copyToChannel: (src: Float32Array) => data.set(src.subarray(0, length)),
        getChannelData: () => data,
      };
    },
  } as unknown as BaseAudioContext;
}

describe("renderRhythmBed", () => {
  it("returns a buffer whose length matches the decoded rendered WAV", () => {
    const spec = GAME_TRACK_SPECS[0];
    const kit = fakeKit();
    const expected = decodeWav(renderGameTrackWav(spec, kit)).samples.length;
    const buffer = renderRhythmBed(spec, kit, fakeCtx());
    expect(buffer.length).toBe(expected);
  });
});

describe("createHitSfx", () => {
  it("produces a short non-silent buffer", () => {
    const buffer = createHitSfx(fakeCtx());
    expect(buffer.length).toBeGreaterThan(0);
    const data = buffer.getChannelData(0);
    expect(data.some((v) => v !== 0)).toBe(true);
  });
});
