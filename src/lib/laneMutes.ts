import { INSTRUMENT_IDS, type InstrumentId } from "./patterns";
import type { LaneVolumes } from "./laneVolumes";

/** Per-lane mute flags. A muted lane keeps its pattern but plays silently. */
export type LaneMutes = Record<InstrumentId, boolean>;

export function createDefaultLaneMutes(): LaneMutes {
  return Object.fromEntries(INSTRUMENT_IDS.map((id) => [id, false])) as LaneMutes;
}

export function cloneLaneMutes(mutes: LaneMutes): LaneMutes {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, mutes[id]]),
  ) as LaneMutes;
}

export function toggleLaneMute(mutes: LaneMutes, instrument: InstrumentId): LaneMutes {
  return {
    ...cloneLaneMutes(mutes),
    [instrument]: !mutes[instrument],
  };
}

export function laneMutesAreDefault(mutes: LaneMutes): boolean {
  return INSTRUMENT_IDS.every((id) => !mutes[id]);
}

/**
 * Effective lane volumes with muted lanes forced to silent. Used when building
 * the playable style so a mute silences the lane without touching its pattern
 * or the fader value the UI still shows.
 */
export function applyLaneMutes(volumes: LaneVolumes, mutes: LaneMutes): LaneVolumes {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, mutes[id] ? 0 : volumes[id]]),
  ) as LaneVolumes;
}

/** Serialize as a fixed-order bitstring, one "0"/"1" per lane in INSTRUMENT_IDS. */
export function serializeLaneMutes(mutes: LaneMutes): string {
  return INSTRUMENT_IDS.map((id) => (mutes[id] ? "1" : "0")).join("");
}

export function deserializeLaneMutes(value: string | null): LaneMutes | null {
  if (value === null || !new RegExp(`^[01]{${INSTRUMENT_IDS.length}}$`).test(value)) {
    return null;
  }

  return Object.fromEntries(
    INSTRUMENT_IDS.map((id, index) => [id, value[index] === "1"]),
  ) as LaneMutes;
}
