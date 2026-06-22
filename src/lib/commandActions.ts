import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import {
  ARRANGEMENT_SECTION_IDS,
  type ArrangementSectionId,
} from "./arrangement";
import { INSTRUMENT_IDS, type InstrumentId } from "./patterns";

/**
 * The contract between the natural-language layer and the app. The LLM
 * intent-parser returns one of these; the fast-path produces them locally; the
 * command bus is the only layer that maps them onto app state.
 */
export type CommandAction =
  | { kind: "selectStyle"; styleId: BeatStyleId }
  | { kind: "setTempo"; mode: "absolute"; bpm: number }
  | { kind: "setTempo"; mode: "relative"; deltaBpm: number }
  | { kind: "setSwing"; mode: "absolute"; swingPercent: number }
  | { kind: "setSwing"; mode: "relative"; deltaPercent: number }
  | { kind: "setLaneMute"; instrumentId: InstrumentId; muted: boolean }
  | { kind: "adjustLaneDensity"; instrumentId: InstrumentId; direction: "busier" | "sparser" }
  | { kind: "addFill" }
  | { kind: "setSectionBars"; sectionId: ArrangementSectionId; bars: number }
  | { kind: "adjustArrangementBars"; sectionId: ArrangementSectionId; deltaBars: number }
  | { kind: "doubleArrangement"; sectionId?: ArrangementSectionId }
  | { kind: "unknown"; reason: string };

const ACTION_KINDS = new Set<CommandAction["kind"]>([
  "selectStyle",
  "setTempo",
  "setSwing",
  "setLaneMute",
  "adjustLaneDensity",
  "addFill",
  "setSectionBars",
  "adjustArrangementBars",
  "doubleArrangement",
  "unknown",
]);

const INSTRUMENT_ID_SET = new Set<InstrumentId>(INSTRUMENT_IDS);
const SECTION_ID_SET = new Set<ArrangementSectionId>(ARRANGEMENT_SECTION_IDS);

export function isCommandAction(value: unknown): value is CommandAction {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  const action = value as Record<string, unknown>;
  if (typeof action.kind !== "string" || !ACTION_KINDS.has(action.kind as CommandAction["kind"])) {
    return false;
  }

  switch (action.kind) {
    case "selectStyle":
      return typeof action.styleId === "string" && action.styleId in BEAT_STYLES;
    case "setTempo":
      if (action.mode === "absolute") {
        return typeof action.bpm === "number" && Number.isFinite(action.bpm);
      }
      if (action.mode === "relative") {
        return typeof action.deltaBpm === "number" && Number.isFinite(action.deltaBpm);
      }
      return false;
    case "setSwing":
      if (action.mode === "absolute") {
        return typeof action.swingPercent === "number" && Number.isFinite(action.swingPercent);
      }
      if (action.mode === "relative") {
        return typeof action.deltaPercent === "number" && Number.isFinite(action.deltaPercent);
      }
      return false;
    case "setLaneMute":
      return (
        typeof action.instrumentId === "string" &&
        INSTRUMENT_ID_SET.has(action.instrumentId as InstrumentId) &&
        typeof action.muted === "boolean"
      );
    case "adjustLaneDensity":
      return (
        typeof action.instrumentId === "string" &&
        INSTRUMENT_ID_SET.has(action.instrumentId as InstrumentId) &&
        (action.direction === "busier" || action.direction === "sparser")
      );
    case "addFill":
      return true;
    case "setSectionBars":
      return (
        typeof action.sectionId === "string" &&
        SECTION_ID_SET.has(action.sectionId as ArrangementSectionId) &&
        typeof action.bars === "number" &&
        Number.isFinite(action.bars)
      );
    case "adjustArrangementBars":
      return (
        typeof action.sectionId === "string" &&
        SECTION_ID_SET.has(action.sectionId as ArrangementSectionId) &&
        typeof action.deltaBars === "number" &&
        Number.isFinite(action.deltaBars)
      );
    case "doubleArrangement":
      return (
        action.sectionId === undefined ||
        (typeof action.sectionId === "string" &&
          SECTION_ID_SET.has(action.sectionId as ArrangementSectionId))
      );
    case "unknown":
      return typeof action.reason === "string";
    default:
      return false;
  }
}
