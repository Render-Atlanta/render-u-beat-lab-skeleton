import { decodeProducerTagSample } from "./producerTagSample";
import { decodeWav, type DecodedAudio } from "./wav";

export type CompressedDecoder = (
  blob: Blob,
) => Promise<{ samples: Float32Array; sampleRate: number }>;

function isWav(file: Blob): boolean {
  return file.type === "audio/wav" || file.type === "audio/x-wav";
}

/**
 * Decode an uploaded audio file to normalized mono PCM. WAV files take a
 * synchronous, unit-testable path via `decodeWav`; compressed formats
 * (mp3/m4a/…) delegate to an injectable AudioContext-based decoder.
 */
export async function decodeAudioFile(
  file: Blob,
  compressedDecoder: CompressedDecoder = decodeProducerTagSample,
): Promise<DecodedAudio> {
  if (isWav(file)) {
    const buffer = await file.arrayBuffer();
    return decodeWav(buffer);
  }
  const { samples, sampleRate } = await compressedDecoder(file);
  const durationMs =
    sampleRate > 0 ? (samples.length / sampleRate) * 1000 : 0;
  return { samples, sampleRate, durationMs };
}
