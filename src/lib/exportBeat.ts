import type { BeatStyle } from "./beatStyles";
import {
  createArrangementPlaybackSections,
  getArrangementBarCount,
  type Arrangement,
} from "./arrangement";
import type { SequencerState } from "./patternState";
import type { Pattern } from "./patterns";
import type { ProducerTagTrigger } from "./producerTag";
import {
  RENDER_SAMPLE_RATE,
  renderPatternToPcm,
  renderedPatternLength,
  type DecodedKit,
} from "./styleRender";
import { INSTRUMENT_IDS } from "./patterns";
import type { DecodedInstrumentVoices } from "./instrumentVoiceRender";
import { mixSampleIntoPcm, tagOffsetsForTrigger } from "./tagMix";
import { encodeWav } from "./wav";

export interface RenderBeatWavInput {
  pattern: Pattern;
  style: BeatStyle;
  kit: DecodedKit;
  loops?: number;
  tag?: { samples: Float32Array; trigger: ProducerTagTrigger };
  /** Decoded sampled instrument voices; lanes without one fall back to synth. */
  voices?: DecodedInstrumentVoices;
}

export interface RenderArrangementWavInput {
  sequencer: SequencerState;
  style: BeatStyle;
  kit: DecodedKit;
  arrangement: Arrangement;
  tag?: { samples: Float32Array; trigger: ProducerTagTrigger };
  /** Decoded sampled instrument voices; lanes without one fall back to synth. */
  voices?: DecodedInstrumentVoices;
}

/** Render drums for `loops` bars, mix in the recorded tag, encode to WAV bytes. */
export function renderBeatWav(input: RenderBeatWavInput): Uint8Array {
  const loops = Math.max(1, Math.floor(input.loops ?? 2));
  const bar = renderPatternToPcm(
    input.pattern,
    input.style,
    input.kit,
    INSTRUMENT_IDS,
    input.voices,
  );
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

/** Render the multi-section arrangement, honoring per-section lane mutes. */
export function renderArrangementWav(input: RenderArrangementWavInput): Uint8Array {
  const loopSamples = getBarSamples(input.style);
  // The rendered bar length is content-independent, so derive the decay tail
  // arithmetically instead of rendering a throwaway bar just to read its length.
  const tailSamples = Math.max(0, renderedPatternLength(input.style) - loopSamples);
  const totalBars = getArrangementBarCount(input.arrangement);
  const drumLength = loopSamples * totalBars + tailSamples;
  const tagOffsets = input.tag
    ? tagOffsetsForTrigger(input.tag.trigger, totalBars, loopSamples)
    : [];
  const tagLength =
    input.tag && tagOffsets.length > 0
      ? Math.max(...tagOffsets) + input.tag.samples.length
      : 0;
  const out = new Float32Array(Math.max(drumLength, tagLength));

  let barOffset = 0;
  for (const section of createArrangementPlaybackSections(
    input.sequencer,
    input.arrangement,
  )) {
    const sectionBar = renderPatternToPcm(
      section.pattern,
      input.style,
      input.kit,
      INSTRUMENT_IDS,
      input.voices,
    );
    for (let bar = 0; bar < section.bars; bar += 1) {
      mixSampleIntoPcm(out, sectionBar, (barOffset + bar) * loopSamples);
    }
    barOffset += section.bars;
  }

  if (input.tag) {
    for (const offset of tagOffsets) {
      mixSampleIntoPcm(out, input.tag.samples, offset);
    }
  }

  return encodeWav(out, RENDER_SAMPLE_RATE);
}

function getBarSamples(style: BeatStyle): number {
  return Math.round((60 / style.bpm / 4) * 16 * RENDER_SAMPLE_RATE);
}
