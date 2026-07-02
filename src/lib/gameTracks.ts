import type { BeatStyleId } from "./beatStyles";
import {
  createDefaultArrangement,
  createBeatLabProject,
  setSectionBars,
  type Arrangement,
  type BeatLabProject,
} from "./arrangement";
import { getArrangementBarCount } from "./arrangement";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import { createPlayableStyle } from "./sequencerDomain";
import { renderArrangementWav } from "./exportBeat";
import { RENDER_SAMPLE_RATE, type DecodedKit } from "./styleRender";

const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2; // mono 16-bit PCM (matches encodeWav)

/**
 * Bar length in samples on the 16th-note grid — the same content-independent
 * value `exportBeat` tiles bars at. `renderArrangementWav` appends the renderer's
 * decay tail after the final bar, which would make a looped game bed restart late
 * (downbeat drift/gap every repeat), so we trim to the exact arrangement length.
 */
function loopSamplesForBpm(bpm: number): number {
  return Math.round((60 / bpm / 4) * 16 * RENDER_SAMPLE_RATE);
}

/** Truncate an encoded mono 16-bit WAV to `sampleCount` samples, fixing the header sizes. */
function trimWavToSamples(wav: Uint8Array, sampleCount: number): Uint8Array {
  const available = Math.floor((wav.length - WAV_HEADER_BYTES) / BYTES_PER_SAMPLE);
  const samples = Math.min(sampleCount, Math.max(0, available));
  const dataLength = samples * BYTES_PER_SAMPLE;
  const out = wav.slice(0, WAV_HEADER_BYTES + dataLength);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(4, 36 + dataLength, true); // RIFF chunk size
  view.setUint32(40, dataLength, true); // data chunk size
  return out;
}

/** One generated game track. `slug` matches the game's stage `scene` value. */
export interface GameTrackSpec {
  slug: string;
  styleId: BeatStyleId;
  bpm: number;
  /** Bars on the `main` section; the loop is `bars + 3` (intro/variation/outro = 1). */
  bars: number;
  /** Optional topline overlay. Length 16; `true` = the step sounds. Absent → no melody. */
  melody?: boolean[];
  /** Optional per-step scale degree (0–6) in the style's `musicalKey`. Length 16. */
  melodyStepPitches?: number[];
}

/**
 * Build a length-16 melody overlay from a map of 1-indexed step → scale degree.
 * Inactive steps stay silent (degree 0). Keeps the spec table readable and
 * guarantees both arrays are exactly 16 long.
 */
function topline(
  stepDegrees: Record<number, number>,
): Pick<GameTrackSpec, "melody" | "melodyStepPitches"> {
  const melody = Array.from({ length: 16 }, () => false);
  const melodyStepPitches = Array.from({ length: 16 }, () => 0);
  for (const [step, degree] of Object.entries(stepDegrees)) {
    const index = Number(step) - 1;
    melody[index] = true;
    melodyStepPitches[index] = degree;
  }
  return { melody, melodyStepPitches };
}

export const GAME_TRACK_SPECS: GameTrackSpec[] = [
  { slug: "airport", styleId: "afrobeats", bpm: 108, bars: 4,
    ...topline({ 1: 0, 3: 2, 6: 4, 7: 3, 9: 4, 11: 6, 14: 0 }) },
  { slug: "connector", styleId: "trap", bpm: 140, bars: 4,
    ...topline({ 1: 0, 8: 6, 11: 4 }) },
  { slug: "badge", styleId: "rnb", bpm: 92, bars: 4,
    ...topline({ 1: 4, 4: 2, 7: 0, 9: 6, 12: 4, 15: 2 }) },
  { slug: "vendor", styleId: "bounce", bpm: 98, bars: 4,
    ...topline({ 1: 0, 3: 0, 5: 2, 7: 2, 9: 4, 11: 4, 13: 2, 15: 0 }) },
  { slug: "mainStage", styleId: "crunk", bpm: 80, bars: 4,
    ...topline({ 1: 0, 7: 0, 9: 4, 15: 4 }) },
  { slug: "afterparty", styleId: "amapiano", bpm: 112, bars: 4,
    ...topline({ 1: 0, 4: 2, 6: 4, 9: 6, 12: 4, 14: 2 }) },
];

export function buildGameTrackSequencer(spec: GameTrackSpec): SequencerState {
  const base = createDefaultSequencerState(spec.styleId);
  const sequencer: SequencerState = { ...base, bpm: spec.bpm };
  if (spec.melody) {
    // Fresh pattern object with a copied melody lane — never mutate the shared preset.
    sequencer.pattern = { ...base.pattern, melody: [...spec.melody] };
  }
  if (spec.melodyStepPitches) {
    sequencer.melodyStepPitches = [...spec.melodyStepPitches];
  }
  return sequencer;
}

export function buildGameTrackArrangement(spec: GameTrackSpec): Arrangement {
  // All four sections required by the project validator; extend `main` for length.
  return setSectionBars(createDefaultArrangement(), "main", spec.bars);
}

export function buildGameTrackProject(spec: GameTrackSpec): BeatLabProject {
  return createBeatLabProject({
    sequencer: buildGameTrackSequencer(spec),
    arrangement: buildGameTrackArrangement(spec),
  });
}

export function renderGameTrackWav(spec: GameTrackSpec, kit: DecodedKit): Uint8Array {
  const sequencer = buildGameTrackSequencer(spec);
  const arrangement = buildGameTrackArrangement(spec);
  const wav = renderArrangementWav({
    sequencer,
    style: createPlayableStyle(sequencer),
    kit,
    arrangement,
    // Tame the raw 808 saw so the bass sits under the drums instead of buzzing.
    softenBass: true,
  });
  // Drop the decay tail so the file is exactly the loop length and repeats seamlessly.
  const loopSamples = loopSamplesForBpm(spec.bpm) * getArrangementBarCount(arrangement);
  return trimWavToSamples(wav, loopSamples);
}
