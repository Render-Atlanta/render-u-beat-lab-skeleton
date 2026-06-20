import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";

/**
 * The contract between the natural-language layer and the app. The LLM
 * intent-parser (Plan 2) returns one of these; the fast-path produces them
 * locally; `applyAction` is the only consumer that mutates state.
 */
export type CommandAction =
  | { kind: "selectStyle"; styleId: BeatStyleId }
  | { kind: "setTempo"; mode: "absolute"; bpm: number }
  | { kind: "setTempo"; mode: "relative"; deltaBpm: number }
  | { kind: "setSwing"; mode: "absolute"; swingPercent: number }
  | { kind: "setSwing"; mode: "relative"; deltaPercent: number }
  | { kind: "unknown"; reason: string };

const ACTION_KINDS = new Set<CommandAction["kind"]>([
  "selectStyle",
  "setTempo",
  "setSwing",
  "unknown",
]);

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
    case "unknown":
      return typeof action.reason === "string";
    default:
      return false;
  }
}
