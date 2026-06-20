import { describe, expect, it } from "vitest";
import { decodeAudioFile } from "./audioFileDecode";
import { encodeWav } from "./wav";

describe("decodeAudioFile", () => {
  it("decodes a WAV blob via the synchronous path", async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const wavBytes = encodeWav(samples, 22050);
    const blob = new Blob([new Uint8Array(wavBytes)], { type: "audio/wav" });
    const decoded = await decodeAudioFile(blob);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.samples.length).toBe(samples.length);
    expect(decoded.samples[3]).toBeCloseTo(1, 2);
  });

  it("delegates non-WAV blobs to the injected compressed decoder", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });
    const decoded = await decodeAudioFile(blob, async () => ({
      samples: new Float32Array([0.1, 0.2]),
      sampleRate: 22050,
    }));
    expect(decoded.samples.length).toBe(2);
    expect(decoded.durationMs).toBeCloseTo((2 / 22050) * 1000, 3);
  });
});
