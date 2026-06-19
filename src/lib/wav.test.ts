import { describe, expect, it } from "vitest";
import { decodeWav, encodeWav } from "./wav";

// Build a canonical PCM WAV in-memory. channels interleaved.
function buildWav(
  channels: number[][],
  sampleRate: number,
  bitsPerSample: number,
  format: 1 | 3 = 1, // 1 = PCM int, 3 = IEEE float
): ArrayBuffer {
  const numChannels = channels.length;
  const numFrames = channels[0].length;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataBytes = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const sample = channels[ch][frame];
      if (format === 3) {
        view.setFloat32(offset, sample, true);
      } else if (bitsPerSample === 16) {
        view.setInt16(offset, Math.round(sample * 32767), true);
      } else if (bitsPerSample === 32) {
        view.setInt32(offset, Math.round(sample * 2147483647), true);
      } else if (bitsPerSample === 24) {
        const v = Math.round(sample * 8388607);
        view.setUint8(offset, v & 0xff);
        view.setUint8(offset + 1, (v >> 8) & 0xff);
        view.setUint8(offset + 2, (v >> 16) & 0xff);
      }
      offset += bytesPerSample;
    }
  }
  return buffer;
}

describe("decodeWav", () => {
  it("decodes 16-bit PCM mono", () => {
    const wav = buildWav([[0, 0.5, -0.5, 1]], 8000, 16);
    const decoded = decodeWav(wav);
    expect(decoded.sampleRate).toBe(8000);
    expect(decoded.samples).toHaveLength(4);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[3]).toBeCloseTo(1, 2);
    expect(decoded.durationMs).toBeCloseTo((4 / 8000) * 1000, 3);
  });

  it("downmixes stereo to mono by averaging channels", () => {
    const wav = buildWav([[1, 0], [0, 1]], 8000, 16);
    const decoded = decodeWav(wav);
    expect(decoded.samples[0]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 2);
  });

  it("decodes 32-bit float PCM", () => {
    const wav = buildWav([[0.25, -0.75]], 16000, 32, 3);
    const decoded = decodeWav(wav);
    expect(decoded.sampleRate).toBe(16000);
    expect(decoded.samples[0]).toBeCloseTo(0.25, 4);
    expect(decoded.samples[1]).toBeCloseTo(-0.75, 4);
  });

  it("throws on non-WAV input", () => {
    const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => decodeWav(bad)).toThrow(/not a WAV|RIFF/i);
  });

  it("decodes 24-bit PCM mono", () => {
    const wav = buildWav([[0.5, -0.5]], 44100, 24);
    const decoded = decodeWav(wav);
    expect(decoded.sampleRate).toBe(44100);
    expect(decoded.samples).toHaveLength(2);
    expect(decoded.samples[0]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[1]).toBeCloseTo(-0.5, 2);
  });

  it("throws on bitsPerSample === 0 (infinite-loop guard)", () => {
    const wav = buildWav([[0.5, -0.5]], 44100, 16);
    // Patch byte 34 (bitsPerSample field in the fmt chunk) to 0
    const dv = new DataView(wav);
    dv.setUint16(34, 0, true);
    expect(() => decodeWav(wav)).toThrow();
  });

  it("throws on an unsupported format tag instead of misreading as PCM", () => {
    const wav = buildWav([[0.5, -0.5]], 44100, 16);
    // Patch byte 20 (format tag) to 2 (an unsupported/compressed format)
    new DataView(wav).setUint16(20, 2, true);
    expect(() => decodeWav(wav)).toThrow(/format tag/i);
  });

  it("clamps a data chunk size that overruns the buffer", () => {
    const wav = buildWav([[0.25, -0.25]], 8000, 16); // 2 frames, 4 data bytes
    // Patch byte 40 (data chunk size) to claim far more bytes than exist
    new DataView(wav).setUint32(40, 0xffffffff, true);
    const decoded = decodeWav(wav);
    // Only the 2 real frames are decoded — no oversized allocation / OOB read
    expect(decoded.samples).toHaveLength(2);
    expect(decoded.samples[0]).toBeCloseTo(0.25, 2);
  });

  it("accepts an ArrayBufferView (Uint8Array subarray with non-zero byteOffset)", () => {
    const wav = buildWav([[0, 0.5, -0.5, 1]], 8000, 16);
    // Prepend 16 bytes of padding so the view has a non-zero byteOffset
    const padded = new ArrayBuffer(16 + wav.byteLength);
    new Uint8Array(padded).set(new Uint8Array(wav), 16);
    const view = new Uint8Array(padded, 16); // byteOffset === 16
    const decoded = decodeWav(view);
    expect(decoded.sampleRate).toBe(8000);
    expect(decoded.samples).toHaveLength(4);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[3]).toBeCloseTo(1, 2);
  });
});

describe("encodeWav", () => {
  it("produces a RIFF/WAVE buffer that decodeWav reads back", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const bytes = encodeWav(samples, 22050);
    const decoded = decodeWav(bytes);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.samples).toHaveLength(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      // 16-bit quantization tolerance.
      expect(Math.abs(decoded.samples[i] - samples[i])).toBeLessThan(0.001);
    }
  });

  it("clamps out-of-range samples to [-1, 1]", () => {
    const bytes = encodeWav(new Float32Array([2, -2]), 8000);
    const decoded = decodeWav(bytes);
    expect(decoded.samples[0]).toBeCloseTo(1, 2);
    expect(decoded.samples[1]).toBeCloseTo(-1, 2);
  });
});
