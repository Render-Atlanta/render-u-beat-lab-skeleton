import type { BeatStyleId } from "./beatStyles";
import type { CommandAction } from "./commandActions";

export const TEMPO_STEP_BPM = 8;
export const SWING_STEP_PERCENT = 5;

// `\bbounce\b` will not match "bouncier" (no trailing word boundary), so the
// swing rules below can safely own that phrase.
const STYLE_KEYWORDS: Array<[RegExp, BeatStyleId]> = [
  [/\b(new orleans|bounce)\b/, "bounce"],
  [/\btrap\b/, "trap"],
  [/\bcrunk\b/, "crunk"],
  [/\bdrill\b/, "drill"],
  [/\b(r&b|rnb|r and b)\b/, "rnb"],
  [/\bpop\b/, "pop"],
  [/\bafrobeats?\b/, "afrobeats"],
  [/\bamapiano\b/, "amapiano"],
  [/\bhouse\b/, "house"],
];

export function parseFastPath(input: string): CommandAction | null {
  const text = input.trim().toLowerCase();
  if (!text) {
    return null;
  }

  for (const [pattern, styleId] of STYLE_KEYWORDS) {
    if (pattern.test(text)) {
      return { kind: "selectStyle", styleId };
    }
  }

  if (/\b(slow(er)?|slow it down|slow down|chill|half[- ]?time)\b/.test(text)) {
    return { kind: "setTempo", mode: "relative", deltaBpm: -TEMPO_STEP_BPM };
  }
  if (/\b(fast(er)?|speed (it )?up|hurry|pick it up)\b/.test(text)) {
    return { kind: "setTempo", mode: "relative", deltaBpm: TEMPO_STEP_BPM };
  }

  // Check the "less" phrasings before the generic "swing" so they win.
  if (/\b(less swing|tighter|straight(er)?)\b/.test(text)) {
    return { kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT };
  }
  if (/\b(more swing|swing|bouncier|looser)\b/.test(text)) {
    return { kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT };
  }

  return null;
}
