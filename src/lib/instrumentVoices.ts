import {
  SYNTH_VOICE_ID,
  VOICED_LANES,
  type LaneVoiceId,
  type LaneVoiceSelection,
  type VoicedLane,
  createDefaultLaneVoiceSelection,
  deserializeLaneVoiceSelection,
  laneVoiceSelectionIsDefault,
  serializeLaneVoiceSelection,
} from "./laneVoiceSelection";

export type NoteSampleMap = Record<string, string>;

export interface InstrumentVoiceOption {
  id: LaneVoiceId;
  lane: VoicedLane;
  name: string;
  /** null for the built-in synth voice; a noteName -> URL map otherwise. */
  samples: NoteSampleMap | null;
  source: string;
  license: string;
}

// Sparse multisample: one WAV every 4 semitones; Sampler interpolates between.
function notes(dir: string, noteNames: string[]): NoteSampleMap {
  return Object.fromEntries(
    noteNames.map((n) => [n, `/instruments/${dir}/${n.replace("#", "s")}.wav`]),
  );
}

const SYNTH = (lane: VoicedLane): InstrumentVoiceOption => ({
  id: SYNTH_VOICE_ID,
  lane,
  name: "Synth",
  samples: null,
  source: "built-in",
  license: "CC0",
});

const MELODY_RANGE = ["C3", "E3", "G#3", "C4", "E4", "G#4", "C5", "E5"];
const BASS_RANGE = ["C1", "E1", "G#1", "C2", "E2", "G#2", "C3"];

export const INSTRUMENT_VOICES: readonly InstrumentVoiceOption[] = [
  SYNTH("melody"),
  { id: "piano", lane: "melody", name: "Grand Piano", samples: notes("piano", MELODY_RANGE), source: "VCSL", license: "CC0" },
  { id: "rhodes", lane: "melody", name: "Rhodes", samples: notes("rhodes", MELODY_RANGE), source: "VCSL", license: "CC0" },
  { id: "strings", lane: "melody", name: "Strings", samples: notes("strings", MELODY_RANGE), source: "VCSL", license: "CC0" },
  SYNTH("bassGuitar"),
  { id: "electric", lane: "bassGuitar", name: "Electric Bass", samples: notes("electric-bass", BASS_RANGE), source: "VCSL", license: "CC0" },
  { id: "upright", lane: "bassGuitar", name: "Upright Bass", samples: notes("upright-bass", BASS_RANGE), source: "VCSL", license: "CC0" },
];

export function getLaneVoiceOptions(lane: VoicedLane): InstrumentVoiceOption[] {
  return INSTRUMENT_VOICES.filter((v) => v.lane === lane);
}

export function isLaneVoiceId(lane: VoicedLane, id: string): boolean {
  return getLaneVoiceOptions(lane).some((v) => v.id === id);
}

export function normalizeLaneVoiceSelection(
  s: Partial<LaneVoiceSelection> | null | undefined,
): LaneVoiceSelection {
  const result = createDefaultLaneVoiceSelection();
  if (!s) return result;
  for (const lane of VOICED_LANES) {
    const candidate = s[lane];
    if (candidate && isLaneVoiceId(lane, candidate)) result[lane] = candidate;
  }
  return result;
}

export function getLaneVoiceSamples(
  lane: VoicedLane,
  id: LaneVoiceId,
): NoteSampleMap | null {
  return getLaneVoiceOptions(lane).find((v) => v.id === id)?.samples ?? null;
}

export function getSelectedLaneVoiceSamples(
  selection: LaneVoiceSelection,
): Partial<Record<VoicedLane, NoteSampleMap>> {
  const result: Partial<Record<VoicedLane, NoteSampleMap>> = {};
  for (const lane of VOICED_LANES) {
    const samples = getLaneVoiceSamples(lane, selection[lane]);
    if (samples) result[lane] = samples;
  }
  return result;
}

export function readLaneVoicesFromUrl(value: string | null): LaneVoiceSelection {
  return normalizeLaneVoiceSelection(deserializeLaneVoiceSelection(value));
}

export function readLaneVoicesFromRecord(value: unknown): LaneVoiceSelection {
  if (!value || typeof value !== "object") {
    return createDefaultLaneVoiceSelection();
  }
  return normalizeLaneVoiceSelection(value as Partial<LaneVoiceSelection>);
}

export function writeLaneVoicesToUrl(laneVoices: LaneVoiceSelection): string | null {
  return laneVoiceSelectionIsDefault(laneVoices)
    ? null
    : serializeLaneVoiceSelection(laneVoices);
}
