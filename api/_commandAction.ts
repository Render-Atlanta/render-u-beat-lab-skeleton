const STYLE_IDS = new Set([
  "trap",
  "crunk",
  "drill",
  "rnb",
  "pop",
  "afrobeats",
  "amapiano",
  "house",
  "bounce",
]);

const INSTRUMENT_IDS = new Set([
  "kick",
  "snare",
  "hat",
  "openHat",
  "clap",
  "808",
  "bassGuitar",
  "melody",
]);

const SECTION_IDS = new Set(["intro", "main", "variation", "outro"]);

export function getAction(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  return (payload as { action?: unknown }).action;
}

export function isCommandAction(action: unknown): boolean {
  if (typeof action !== "object" || action === null) {
    return false;
  }
  const value = action as Record<string, unknown>;
  switch (value.kind) {
    case "selectStyle":
      return typeof value.styleId === "string" && STYLE_IDS.has(value.styleId);
    case "setTempo":
      return (
        (value.mode === "absolute" &&
          typeof value.bpm === "number" &&
          Number.isFinite(value.bpm) &&
          value.bpm >= 60 &&
          value.bpm <= 180) ||
        (value.mode === "relative" &&
          typeof value.deltaBpm === "number" &&
          Number.isFinite(value.deltaBpm))
      );
    case "setSwing":
      return (
        (value.mode === "absolute" &&
          typeof value.swingPercent === "number" &&
          Number.isFinite(value.swingPercent) &&
          value.swingPercent >= 0 &&
          value.swingPercent <= 30) ||
        (value.mode === "relative" &&
          typeof value.deltaPercent === "number" &&
          Number.isFinite(value.deltaPercent))
      );
    case "setLaneMute":
      return (
        typeof value.instrumentId === "string" &&
        INSTRUMENT_IDS.has(value.instrumentId) &&
        typeof value.muted === "boolean"
      );
    case "adjustLaneDensity":
      return (
        typeof value.instrumentId === "string" &&
        INSTRUMENT_IDS.has(value.instrumentId) &&
        (value.direction === "busier" || value.direction === "sparser")
      );
    case "addFill":
      return true;
    case "setSectionBars":
      return (
        typeof value.sectionId === "string" &&
        SECTION_IDS.has(value.sectionId) &&
        typeof value.bars === "number" &&
        Number.isFinite(value.bars)
      );
    case "adjustArrangementBars":
      return (
        typeof value.sectionId === "string" &&
        SECTION_IDS.has(value.sectionId) &&
        typeof value.deltaBars === "number" &&
        Number.isFinite(value.deltaBars)
      );
    case "doubleArrangement":
      return (
        value.sectionId === undefined ||
        (typeof value.sectionId === "string" && SECTION_IDS.has(value.sectionId))
      );
    case "unknown":
      return typeof value.reason === "string";
    default:
      return false;
  }
}
