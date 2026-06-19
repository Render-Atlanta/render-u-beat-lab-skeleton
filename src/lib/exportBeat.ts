import type { BeatStyle } from "./beatStyles";
import type { Pattern } from "./patterns";
import type { ProducerTagTrigger } from "./producerTag";
import { RENDER_SAMPLE_RATE, renderPatternToPcm, type DecodedKit } from "./styleRender";
import { mixSampleIntoPcm, tagOffsetsForTrigger } from "./tagMix";
import { encodeWav } from "./wav";

export interface RenderBeatWavInput {
  pattern: Pattern;
  style: BeatStyle;
  kit: DecodedKit;
  loops?: number;
  tag?: { samples: Float32Array; trigger: ProducerTagTrigger };
}

/** Render drums for `loops` bars, mix in the recorded tag, encode to WAV bytes. */
export function renderBeatWav(input: RenderBeatWavInput): Uint8Array {
  const loops = Math.max(1, Math.floor(input.loops ?? 2));
  const bar = renderPatternToPcm(input.pattern, input.style, input.kit);
  // One bar's worth of samples (drop the renderer's decay tail when tiling so
  // loops butt up cleanly); use the 16th-grid bar length.
  const loopSamples = Math.round((60 / input.style.bpm / 4) * 16 * RENDER_SAMPLE_RATE);

  const drumLength = loopSamples * loops + Math.max(0, bar.length - loopSamples);
  const tagOffsets = input.tag ? tagOffsetsForTrigger(input.tag.trigger, loops, loopSamples) : [];
  const tagLength =
    input.tag && tagOffsets.length > 0
      ? Math.max(...tagOffsets) + input.tag.samples.length
      : 0;
  const out = new Float32Array(Math.max(drumLength, tagLength));

  for (let loop = 0; loop < loops; loop += 1) {
    mixSampleIntoPcm(out, bar, loop * loopSamples);
  }

  if (input.tag) {
    for (const offset of tagOffsets) {
      mixSampleIntoPcm(out, input.tag.samples, offset);
    }
  }

  return encodeWav(out, RENDER_SAMPLE_RATE);
}
