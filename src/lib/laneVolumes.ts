import { INSTRUMENT_IDS, type InstrumentId } from "./patterns";

export type LaneVolumes = Record<InstrumentId, number>;

export const DEFAULT_LANE_VOLUME = 1;
export const MIN_LANE_VOLUME = 0;
export const MAX_LANE_VOLUME = 1.5;
const LEGACY_VOLUME_ORDER: InstrumentId[] = ["kick", "snare", "hat", "openHat", "clap", "808"];

export function createDefaultLaneVolumes(): LaneVolumes {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, DEFAULT_LANE_VOLUME]),
  ) as LaneVolumes;
}

export function cloneLaneVolumes(volumes: LaneVolumes): LaneVolumes {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, volumes[id]]),
  ) as LaneVolumes;
}

export function normalizeLaneVolume(value: unknown, fallback = DEFAULT_LANE_VOLUME): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(MIN_LANE_VOLUME, Math.min(MAX_LANE_VOLUME, value));
}

export function normalizeLaneVolumes(
  input?: Partial<Record<InstrumentId, unknown>>,
): LaneVolumes {
  const defaults = createDefaultLaneVolumes();

  if (!input) {
    return defaults;
  }

  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, normalizeLaneVolume(input[id], defaults[id])]),
  ) as LaneVolumes;
}

export function updateLaneVolume(
  volumes: LaneVolumes,
  instrument: InstrumentId,
  volume: number,
): LaneVolumes {
  return {
    ...cloneLaneVolumes(volumes),
    [instrument]: normalizeLaneVolume(volume),
  };
}

export function serializeLaneVolumes(volumes: LaneVolumes): string {
  return INSTRUMENT_IDS.map((id) => String(volumes[id])).join(",");
}

export function deserializeLaneVolumes(value: string | null): LaneVolumes | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parts = value.split(",");
  const order =
    parts.length === INSTRUMENT_IDS.length
      ? INSTRUMENT_IDS
      : parts.length === LEGACY_VOLUME_ORDER.length
        ? LEGACY_VOLUME_ORDER
        : null;
  if (!order) {
    return null;
  }

  const parsed = Object.fromEntries(
    order.map((id, index) => [id, Number(parts[index])]),
  ) as Partial<Record<InstrumentId, number>>;

  if (order.some((id) => !Number.isFinite(parsed[id]))) {
    return null;
  }

  return normalizeLaneVolumes(parsed);
}

export function getLaneVolumes(style: { laneVolumes?: LaneVolumes }): LaneVolumes {
  return style.laneVolumes ? cloneLaneVolumes(style.laneVolumes) : createDefaultLaneVolumes();
}

export function laneVolumesAreDefault(volumes: LaneVolumes): boolean {
  return INSTRUMENT_IDS.every((id) => volumes[id] === DEFAULT_LANE_VOLUME);
}
