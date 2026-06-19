import { RENDER_SAMPLE_RATE } from "./styleRender";

export interface ProducerTagSampleRuntime {
  AudioContext?: typeof AudioContext;
}

/**
 * Decode a mic-captured Blob (WebM/Opus or any browser-supported format) into
 * normalized PCM at RENDER_SAMPLE_RATE.  Browser-only — not unit tested.
 */
export async function decodeProducerTagSample(
  blob: Blob,
  runtime?: ProducerTagSampleRuntime,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AudioContextClass =
    (runtime?.AudioContext) ??
    (typeof AudioContext !== "undefined" ? AudioContext : undefined);

  if (!AudioContextClass) {
    throw new Error("AudioContext is not available in this environment.");
  }

  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContextClass();

  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    // Downmix to mono: use channel 0 only.
    const raw = decoded.getChannelData(0);

    // Nearest-sample resample to RENDER_SAMPLE_RATE.
    const ratio = decoded.sampleRate / RENDER_SAMPLE_RATE;
    const outLength = Math.ceil(raw.length / ratio);
    const samples = new Float32Array(outLength);

    for (let i = 0; i < outLength; i += 1) {
      const srcIndex = Math.round(i * ratio);
      samples[i] = raw[Math.min(srcIndex, raw.length - 1)];
    }

    return { samples, sampleRate: RENDER_SAMPLE_RATE };
  } finally {
    await ctx.close();
  }
}
