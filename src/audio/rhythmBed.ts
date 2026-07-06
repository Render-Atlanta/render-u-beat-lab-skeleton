import { renderGameTrackWav, type GameTrackSpec } from "../lib/gameTracks";
import type { DecodedKit } from "../lib/styleRender";
import { decodeWav } from "../lib/wav";

// Render a stage's backing bed to one decoded AudioBuffer. Reuses the offline WAV
// renderer (pure, browser-safe — already used by "Download WAV") and the repo's pure
// WAV decoder, so the bed matches buildRhythmChart's timing exactly. Mono, 22050 Hz;
// the browser resamples to the context rate on playback.
export function renderRhythmBed(spec: GameTrackSpec, kit: DecodedKit, ctx: BaseAudioContext): AudioBuffer {
  const wav = renderGameTrackWav(spec, kit);
  const { samples, sampleRate } = decodeWav(wav);
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  // decodeWav's Float32Array is backed by a plain ArrayBuffer; the DOM lib's
  // copyToChannel signature narrows to Float32Array<ArrayBuffer> (same cast
  // pattern as webAudioBeatEngine's getByteFrequencyData call).
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  return buffer;
}

// A short synthesized hit stab (~120ms decaying sine), rendered once and replayed per
// hit via a fresh AudioBufferSourceNode. No sample asset required.
export function createHitSfx(ctx: BaseAudioContext, freq = 880, durationSec = 0.12): AudioBuffer {
  const { sampleRate } = ctx;
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 30) * 0.5;
  }
  return buffer;
}
