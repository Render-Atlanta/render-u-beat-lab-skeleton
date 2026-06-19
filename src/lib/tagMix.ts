import type { ProducerTagTrigger } from "./producerTag";

/** Add `sample` into `dest` starting at `offsetSamples`, clamped to bounds. */
export function mixSampleIntoPcm(
  dest: Float32Array,
  sample: Float32Array,
  offsetSamples: number,
): void {
  for (let i = 0; i < sample.length; i += 1) {
    const pos = offsetSamples + i;
    if (pos < 0 || pos >= dest.length) {
      continue;
    }
    dest[pos] += sample[i];
  }
}

/** Sample offsets where the tag is placed, given the trigger and loop layout. */
export function tagOffsetsForTrigger(
  trigger: ProducerTagTrigger,
  loops: number,
  loopSamples: number,
): number[] {
  if (trigger === "intro") {
    return [0];
  }
  if (trigger === "loop") {
    return Array.from({ length: Math.max(0, loops) }, (_, i) => i * loopSamples);
  }
  return [];
}
