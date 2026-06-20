import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import {
  cloneLaneVolumes,
  createDefaultLaneVolumes,
  deserializeLaneVolumes,
  laneVolumesAreDefault,
  serializeLaneVolumes,
  type LaneVolumes,
} from "./laneVolumes";
import {
  cloneLaneMutes,
  createDefaultLaneMutes,
  deserializeLaneMutes,
  laneMutesAreDefault,
  serializeLaneMutes,
  type LaneMutes,
} from "./laneMutes";
import { INSTRUMENT_IDS, type InstrumentId, type Pattern } from "./patterns";
import {
  bassStepPitchesAreDefault,
  cloneBassStepPitches,
  cloneMelodyStepPitches,
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
  deserializeBassStepPitches,
  deserializeMelodyStepPitches,
  melodyStepPitchesAreDefault,
  serializeBassStepPitches,
  serializeMelodyStepPitches,
  type BassStepPitches,
  type MelodyStepPitches,
} from "./stepPitch";
import {
  cloneStepVelocities,
  createDefaultStepVelocities,
  deserializeStepVelocities,
  serializeStepVelocities,
  stepVelocitiesAreDefault,
  type StepVelocities,
} from "./stepVelocity";

export const INSTRUMENT_ORDER: InstrumentId[] = INSTRUMENT_IDS;

export interface SequencerState {
  styleId: BeatStyleId;
  bpm: number;
  swing: number;
  pattern: Pattern;
  laneVolumes: LaneVolumes;
  laneMutes: LaneMutes;
  stepVelocities: StepVelocities;
  bassStepPitches: BassStepPitches;
  melodyStepPitches: MelodyStepPitches;
}

export function createDefaultSequencerState(styleId: BeatStyleId): SequencerState {
  const style = BEAT_STYLES[styleId];
  return {
    styleId,
    bpm: style.bpm,
    swing: style.swing,
    pattern: clonePattern(style.pattern),
    laneVolumes: createDefaultLaneVolumes(),
    laneMutes: createDefaultLaneMutes(),
    stepVelocities: createDefaultStepVelocities(),
    bassStepPitches: createDefaultBassStepPitches(),
    melodyStepPitches: createDefaultMelodyStepPitches(),
  };
}

export function clonePattern(pattern: Pattern): Pattern {
  return Object.fromEntries(
    INSTRUMENT_ORDER.map((id) => [id, [...pattern[id]]]),
  ) as Pattern;
}

export function togglePatternStep(
  pattern: Pattern,
  instrument: InstrumentId,
  stepIndex: number,
): Pattern {
  if (stepIndex < 0 || stepIndex > 15 || !Number.isInteger(stepIndex)) {
    throw new Error(`Step index must be an integer from 0 to 15: ${stepIndex}`);
  }

  const next = clonePattern(pattern);
  next[instrument][stepIndex] = !next[instrument][stepIndex];
  return next;
}

export function serializePattern(pattern: Pattern): string {
  return INSTRUMENT_ORDER.map((instrument) =>
    pattern[instrument].map((step) => (step ? "1" : "0")).join(""),
  ).join(".");
}

const LEGACY_LANE_ORDER: InstrumentId[] = ["kick", "snare", "hat", "openHat"];
const SIX_LANE_ORDER: InstrumentId[] = ["kick", "snare", "hat", "openHat", "clap", "808"];

export function deserializePattern(value: string): Pattern | null {
  const rows = value.split(".");
  const order =
    rows.length === INSTRUMENT_ORDER.length
      ? INSTRUMENT_ORDER
      : rows.length === SIX_LANE_ORDER.length
        ? SIX_LANE_ORDER
      : rows.length === LEGACY_LANE_ORDER.length
        ? LEGACY_LANE_ORDER
        : null;
  if (!order) {
    return null;
  }

  const empty = () => Array.from({ length: 16 }, () => false);
  const pattern = Object.fromEntries(
    INSTRUMENT_ORDER.map((id) => [id, empty()]),
  ) as Pattern;

  for (let i = 0; i < order.length; i += 1) {
    const row = rows[i];
    if (!/^[01]{16}$/.test(row)) {
      return null;
    }
    pattern[order[i]] = row.split("").map((cell) => cell === "1");
  }

  return pattern;
}

export function readSequencerStateFromParams(params: URLSearchParams): SequencerState {
  const requestedStyle = params.get("style") as BeatStyleId | null;
  const styleId =
    requestedStyle && Object.prototype.hasOwnProperty.call(BEAT_STYLES, requestedStyle)
      ? requestedStyle
      : "trap";
  const defaults = createDefaultSequencerState(styleId);
  const bpm = readClampedNumber(params, "bpm", 60, 180, defaults.bpm);
  const swingPercent = readClampedNumber(
    params,
    "swing",
    0,
    30,
    Math.round(defaults.swing * 100),
  );
  const pattern = deserializePattern(params.get("pattern") ?? "") ?? defaults.pattern;
  const laneVolumes =
    deserializeLaneVolumes(params.get("vol")) ?? defaults.laneVolumes;
  const laneMutes =
    deserializeLaneMutes(params.get("mute")) ?? defaults.laneMutes;
  const stepVelocities =
    deserializeStepVelocities(params.get("vel")) ?? defaults.stepVelocities;
  const bassStepPitches =
    deserializeBassStepPitches(params.get("bass")) ?? defaults.bassStepPitches;
  const melodyStepPitches =
    deserializeMelodyStepPitches(params.get("melody")) ?? defaults.melodyStepPitches;

  return {
    styleId,
    bpm,
    swing: swingPercent / 100,
    pattern,
    laneVolumes,
    laneMutes,
    stepVelocities,
    bassStepPitches,
    melodyStepPitches,
  };
}

export function writeSequencerStateToParams(state: SequencerState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("style", state.styleId);
  params.set("bpm", String(state.bpm));
  params.set("swing", String(Math.round(state.swing * 100)));
  params.set("pattern", serializePattern(state.pattern));
  if (!laneVolumesAreDefault(state.laneVolumes)) {
    params.set("vol", serializeLaneVolumes(state.laneVolumes));
  }
  if (!laneMutesAreDefault(state.laneMutes)) {
    params.set("mute", serializeLaneMutes(state.laneMutes));
  }
  if (!stepVelocitiesAreDefault(state.stepVelocities)) {
    params.set("vel", serializeStepVelocities(state.stepVelocities));
  }
  if (!bassStepPitchesAreDefault(state.bassStepPitches)) {
    params.set("bass", serializeBassStepPitches(state.bassStepPitches));
  }
  if (!melodyStepPitchesAreDefault(state.melodyStepPitches)) {
    params.set("melody", serializeMelodyStepPitches(state.melodyStepPitches));
  }
  return params;
}

export function cloneSequencerState(sequencer: SequencerState): SequencerState {
  return {
    styleId: sequencer.styleId,
    bpm: sequencer.bpm,
    swing: sequencer.swing,
    pattern: clonePattern(sequencer.pattern),
    laneVolumes: cloneLaneVolumes(sequencer.laneVolumes),
    laneMutes: cloneLaneMutes(sequencer.laneMutes),
    stepVelocities: cloneStepVelocities(sequencer.stepVelocities),
    bassStepPitches: cloneBassStepPitches(sequencer.bassStepPitches),
    melodyStepPitches: cloneMelodyStepPitches(sequencer.melodyStepPitches),
  };
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function readClampedNumber(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = params.get(key);
  if (value === null) {
    return fallback;
  }

  return clampNumber(Number(value), min, max, fallback);
}
