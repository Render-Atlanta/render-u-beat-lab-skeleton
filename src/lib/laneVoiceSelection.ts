export const VOICED_LANES = ["melody", "bassGuitar"] as const;
export type VoicedLane = (typeof VOICED_LANES)[number];

export const SYNTH_VOICE_ID = "synth";
export type LaneVoiceId = string;

export type LaneVoiceSelection = Record<VoicedLane, LaneVoiceId>;

export function createDefaultLaneVoiceSelection(): LaneVoiceSelection {
  return { melody: SYNTH_VOICE_ID, bassGuitar: SYNTH_VOICE_ID };
}

export function cloneLaneVoiceSelection(s: LaneVoiceSelection): LaneVoiceSelection {
  return { melody: s.melody, bassGuitar: s.bassGuitar };
}

export function laneVoiceSelectionIsDefault(s: LaneVoiceSelection): boolean {
  return VOICED_LANES.every((lane) => s[lane] === SYNTH_VOICE_ID);
}

// Encoded as `lane~id` pairs joined by `.`, e.g. "melody~piano.bassGuitar~electric".
export function serializeLaneVoiceSelection(s: LaneVoiceSelection): string {
  return VOICED_LANES.map((lane) => `${lane}~${s[lane]}`).join(".");
}

export function deserializeLaneVoiceSelection(
  value: string | null,
): LaneVoiceSelection | null {
  if (!value) return null;
  const result = createDefaultLaneVoiceSelection();
  let matched = false;
  for (const pair of value.split(".")) {
    const match = /^(melody|bassGuitar)~([A-Za-z0-9_-]+)$/.exec(pair);
    if (!match) return null;
    result[match[1] as VoicedLane] = match[2];
    matched = true;
  }
  return matched ? result : null;
}
