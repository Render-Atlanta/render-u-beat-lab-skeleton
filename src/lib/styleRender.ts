import type { BeatStyle } from "./beatStyles";
import { getLaneVolumes } from "./laneVolumes";
import { INSTRUMENT_IDS, type InstrumentId, type Pattern } from "./patterns";
import {
  getBassPitchForStep,
  getMelodyPitchForStep,
  synthesizeBassNotePcm,
  synthesizeMelodyNotePcm,
} from "./stepPitch";
import {
  getBassGuitarPitchForStep,
  synthesizeBassGuitarNotePcm,
} from "./bassGuitarPitch";
import { getStepVelocities, getStepVelocityFactor } from "./stepVelocity";
import { applyMixEffectsToPcm, normalizeMixEffects } from "./mixEffects";
import {
  renderSampledNotePcm,
  type DecodedInstrumentVoices,
} from "./instrumentVoiceRender";

export const RENDER_SAMPLE_RATE = 22050;
const STEPS = 16;
const TAIL_SECONDS = 0.5;
const PEAK_TARGET = 0.9;

type SampledInstrumentId = Exclude<InstrumentId, "melody" | "bassGuitar">;
export type DecodedKit = Record<SampledInstrumentId, Float32Array>;

/**
 * Length in samples of a single rendered bar (one 16-step pattern + decay tail).
 * Content-independent — a pure function of tempo and constants — so callers that
 * only need the length must not render a throwaway bar to measure it.
 */
export function renderedPatternLength(style: BeatStyle): number {
  const stepSec = 60 / style.bpm / 4;
  const barSec = STEPS * stepSec;
  return Math.ceil((barSec + TAIL_SECONDS) * RENDER_SAMPLE_RATE);
}

export function renderPatternToPcm(
  pattern: Pattern,
  style: BeatStyle,
  kit: DecodedKit,
  lanes: InstrumentId[] = INSTRUMENT_IDS,
  voices: DecodedInstrumentVoices = {},
): Float32Array {
  const stepSec = 60 / style.bpm / 4; // 16th-note duration
  const length = renderedPatternLength(style);
  const out = new Float32Array(length);
  // Clamp swing to [0, 0.5] to match engine behavior and prevent negative sample start indices.
  const swing = Math.max(0, Math.min(0.5, style.swing));
  const laneVolumes = getLaneVolumes(style);
  const stepVelocities = getStepVelocities(style);

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
        const hitGain = laneVolume * getStepVelocityFactor(stepVelocities[lane][i]);
        for (let s = 0; s < sample.length && start + s < length; s += 1) {
          out[start + s] += sample[s] * hitGain;
        }
      });
      continue;
    }

    if (lane === "bassGuitar") {
      const voice = voices.bassGuitar;
      pattern[lane].forEach((on, i) => {
        if (!on) return;
        const pitch = getBassGuitarPitchForStep(
          style.musicalKey,
          i,
          style.bassGuitarStepPitches,
        );
        // Bass notes ring for an eighth note (two 16th steps).
        const sample = voice
          ? renderSampledNotePcm(voice, pitch.frequency, stepSec * 2, RENDER_SAMPLE_RATE)
          : synthesizeBassGuitarNotePcm(pitch.frequency, RENDER_SAMPLE_RATE);
        const swungSec = i * stepSec + (i % 2 === 1 ? swing * stepSec : 0);
        const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
        const hitGain = laneVolume * getStepVelocityFactor(stepVelocities[lane][i]);
        for (let s = 0; s < sample.length && start + s < length; s += 1) {
          out[start + s] += sample[s] * hitGain;
        }
      });
      continue;
    }

    if (lane === "melody") {
      const voice = voices.melody;
      pattern[lane].forEach((on, i) => {
        if (!on) return;
        const pitch = getMelodyPitchForStep(style.musicalKey, i, style.melodyStepPitches);
        // Melody notes ring for a sixteenth note (one step).
        const sample = voice
          ? renderSampledNotePcm(voice, pitch.frequency, stepSec, RENDER_SAMPLE_RATE)
          : synthesizeMelodyNotePcm(pitch.frequency, RENDER_SAMPLE_RATE);
        const swungSec = i * stepSec + (i % 2 === 1 ? swing * stepSec : 0);
        const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
        const hitGain = laneVolume * getStepVelocityFactor(stepVelocities[lane][i]);
        for (let s = 0; s < sample.length && start + s < length; s += 1) {
          out[start + s] += sample[s] * hitGain;
        }
      });
      continue;
    }

    const sample = kit[lane];
    if (!sample) {
      throw new Error(`Missing kit sample for ${lane}`);
    }
    pattern[lane].forEach((on, i) => {
      if (!on) return;
      // Swing: delay odd 16ths by a fraction of a step.
      const swungSec = i * stepSec + (i % 2 === 1 ? swing * stepSec : 0);
      const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
      const hitGain = laneVolume * getStepVelocityFactor(stepVelocities[lane][i]);
      for (let s = 0; s < sample.length && start + s < length; s += 1) {
        out[start + s] += sample[s] * hitGain;
      }
    });
  }

  const effected = applyMixEffectsToPcm(
    out,
    RENDER_SAMPLE_RATE,
    normalizeMixEffects(style.mixEffects),
  );

  // Peak-normalize deterministically so the spectral features have a stable scale.
  let peak = 0;
  for (let i = 0; i < effected.length; i += 1) peak = Math.max(peak, Math.abs(effected[i]));
  if (peak > 0) {
    const gain = PEAK_TARGET / peak;
    for (let i = 0; i < effected.length; i += 1) effected[i] *= gain;
  }
  return effected;
}
