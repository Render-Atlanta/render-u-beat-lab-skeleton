import { describe, expect, it } from "vitest";
import { loadKitFromDisk } from "./loadKit.node";
import { getArrangementBarCount } from "./arrangement";
import { RENDER_SAMPLE_RATE } from "./styleRender";
import {
  GAME_TRACK_SPECS,
  buildGameTrackArrangement,
  renderGameTrackWav,
} from "./gameTracks";

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

describe("renderGameTrackWav", () => {
  const kit = loadKitFromDisk();

  it("renders a non-empty, valid WAV for every spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const wav = renderGameTrackWav(spec, kit);
      expect(wav.length, spec.slug).toBeGreaterThan(44); // header + samples
      expect(readAscii(wav, 0, 4)).toBe("RIFF");
      expect(readAscii(wav, 8, 4)).toBe("WAVE");
      // sample rate at byte 24 (little-endian u32)
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
      expect(view.getUint32(24, true)).toBe(22050);
    }
  });

  it("trims to exactly the loop length (no decay tail) so beds loop seamlessly", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const wav = renderGameTrackWav(spec, kit);
      const bars = getArrangementBarCount(buildGameTrackArrangement(spec));
      const loopSamples = Math.round((60 / spec.bpm / 4) * 16 * RENDER_SAMPLE_RATE) * bars;
      // 44-byte header + mono 16-bit PCM, no trailing decay tail.
      expect(wav.length, spec.slug).toBe(44 + loopSamples * 2);
      // data-chunk size header matches the trimmed payload.
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
      expect(view.getUint32(40, true)).toBe(loopSamples * 2);
    }
  });
});
