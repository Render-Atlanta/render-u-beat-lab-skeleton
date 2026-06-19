import type { BeatStyle } from "./beatStyles";
import { getLaneVolumes } from "./laneVolumes";
import { INSTRUMENT_IDS, type InstrumentId, type Pattern } from "./patterns";
import { getBassPitchForStep, synthesizeBassNotePcm } from "./stepPitch";

export const RENDER_SAMPLE_RATE = 22050;
const STEPS = 16;
const TAIL_SECONDS = 0.5;
const PEAK_TARGET = 0.9;

export type DecodedKit = Record<InstrumentId, Float32Array>;

export function renderPatternToPcm(
  pattern: Pattern,
  style: BeatStyle,
  kit: DecodedKit,
  lanes: InstrumentId[] = INSTRUMENT_IDS,
): Float32Array {
  const stepSec = 60 / style.bpm / 4; // 16th-note duration
  const barSec = STEPS * stepSec;
  const length = Math.ceil((barSec + TAIL_SECONDS) * RENDER_SAMPLE_RATE);
  const out = new Float32Array(length);
  // Clamp swing to [0, 0.5] to match engine behavior and prevent negative sample start indices.
  const swing = Math.max(0, Math.min(0.5, style.swing));
  const laneVolumes = getLaneVolumes(style);

  for (const lane of lanes) {
    const laneVolume = laneVolumes[lane];
    if (laneVolume === 0) {
      continue;
    }

    if (lane === "808") {
      pattern[lane].forEach((on, i) => {
        if (!on) return;
        const pitch = getBassPitchForStep(style.musicalKey, i, style.bassStepPitches);
        const sample = synthesizeBassNotePcm(pitch.frequency, RENDER_SAMPLE_RATE);
        const swungSec = i * stepSec + (i % 2 === 1 ? swing * stepSec : 0);
        const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
        for (let s = 0; s < sample.length && start + s < length; s += 1) {
          out[start + s] += sample[s] * laneVolume;
        }
      });
      continue;
    }

    const sample = kit[lane];
    pattern[lane].forEach((on, i) => {
      if (!on) return;
      // Swing: delay odd 16ths by a fraction of a step.
      const swungSec = i * stepSec + (i % 2 === 1 ? swing * stepSec : 0);
      const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
      for (let s = 0; s < sample.length && start + s < length; s += 1) {
        out[start + s] += sample[s] * laneVolume;
      }
    });
  }

  // Peak-normalize deterministically so the spectral features have a stable scale.
  let peak = 0;
  for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const gain = PEAK_TARGET / peak;
    for (let i = 0; i < out.length; i += 1) out[i] *= gain;
  }
  return out;
}
