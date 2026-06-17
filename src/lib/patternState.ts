import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { type InstrumentId, type Pattern } from "./patterns";

export const INSTRUMENT_ORDER: InstrumentId[] = ["kick", "snare", "hat", "openHat"];

export interface SequencerState {
  styleId: BeatStyleId;
  bpm: number;
  swing: number;
  pattern: Pattern;
}

export function createDefaultSequencerState(styleId: BeatStyleId): SequencerState {
  const style = BEAT_STYLES[styleId];
  return {
    styleId,
    bpm: style.bpm,
    swing: style.swing,
    pattern: clonePattern(style.pattern),
  };
}

export function clonePattern(pattern: Pattern): Pattern {
  return {
    kick: [...pattern.kick],
    snare: [...pattern.snare],
    hat: [...pattern.hat],
    openHat: [...pattern.openHat],
  };
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

export function deserializePattern(value: string): Pattern | null {
  const rows = value.split(".");
  if (rows.length !== INSTRUMENT_ORDER.length) {
    return null;
  }

  const entries = INSTRUMENT_ORDER.map((instrument, index) => {
    const row = rows[index];
    if (!/^[01]{16}$/.test(row)) {
      return null;
    }

    return [instrument, row.split("").map((cell) => cell === "1")] as const;
  });

  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return Object.fromEntries(entries as Array<readonly [InstrumentId, boolean[]]>) as Pattern;
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

  return {
    styleId,
    bpm,
    swing: swingPercent / 100,
    pattern,
  };
}

export function writeSequencerStateToParams(state: SequencerState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("style", state.styleId);
  params.set("bpm", String(state.bpm));
  params.set("swing", String(Math.round(state.swing * 100)));
  params.set("pattern", serializePattern(state.pattern));
  return params;
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
