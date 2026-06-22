import type { BeatStyleId } from "./beatStyles";
import type { CommandAction } from "./commandActions";
import type { ArrangementSectionId } from "./arrangement";
import type { InstrumentId } from "./patterns";

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

const LANE_KEYWORDS: Array<[RegExp, InstrumentId]> = [
  [/\b(kick|kicks|drum|drums)\b/, "kick"],
  [/\b(snare|snares)\b/, "snare"],
  [/\b(open hat|open hats|open)\b/, "openHat"],
  [/\b(hi[- ]?hat|hi[- ]?hats|hat|hats)\b/, "hat"],
  [/\b(clap|claps)\b/, "clap"],
  [/\b(bass guitar|bassline|bass line)\b/, "bassGuitar"],
  [/\b(808|sub|bass)\b/, "808"],
  [/\b(melody|lead|hook)\b/, "melody"],
];

const SECTION_KEYWORDS: Array<[RegExp, ArrangementSectionId]> = [
  [/\bintro\b/, "intro"],
  [/\b(main|hook|chorus|drop)\b/, "main"],
  [/\b(variation|bridge|switch[- ]?up)\b/, "variation"],
  [/\b(outro|ending|end)\b/, "outro"],
];

const BAR_WORDS = new Map<string, number>([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
]);

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

  const section = findSection(text);
  const barCount = findBarCount(text);
  if (/\b(double|twice|x2)\b/.test(text) && /\b(beat|song|arrangement|loop|section|intro|main|hook|chorus|variation|outro)\b/.test(text)) {
    return section
      ? { kind: "doubleArrangement", sectionId: section }
      : { kind: "doubleArrangement" };
  }
  if (section && barCount !== null && /\b(make|set|turn|be)\b/.test(text)) {
    return { kind: "setSectionBars", sectionId: section, bars: barCount };
  }
  if (/\b(fill|roll|turnaround)\b/.test(text)) {
    return { kind: "addFill" };
  }
  if (
    (/\b(extend|longer|more bars?)\b/.test(text) ||
      /\badd\b.*\bbars?\b/.test(text)) &&
    /\b(beat|song|arrangement|loop|section|intro|main|hook|chorus|variation|outro)\b/.test(text)
  ) {
    return {
      kind: "adjustArrangementBars",
      sectionId: section ?? "main",
      deltaBars: barCount ?? 4,
    };
  }
  if (
    (/\b(shorten|shorter|fewer bars?|less bars?)\b/.test(text) ||
      /\bremove\b.*\bbars?\b/.test(text)) &&
    /\b(beat|song|arrangement|loop|section|intro|main|hook|chorus|variation|outro)\b/.test(text)
  ) {
    return {
      kind: "adjustArrangementBars",
      sectionId: section ?? "main",
      deltaBars: -(barCount ?? 1),
    };
  }

  const lane = findLane(text);
  if (lane && /\b(unmute|bring back|turn back on|restore)\b/.test(text)) {
    return { kind: "setLaneMute", instrumentId: lane, muted: false };
  }
  if (lane && /\b(mute|silence|turn off|drop out|remove sound)\b/.test(text)) {
    return { kind: "setLaneMute", instrumentId: lane, muted: true };
  }

  if (/\b(busier|more busy|more notes|add more|more hits|more hats|more kicks|more snares)\b/.test(text)) {
    return { kind: "adjustLaneDensity", instrumentId: lane ?? "hat", direction: "busier" };
  }
  if (/\b(sparser|less busy|fewer|less notes|less hits|take out|simpler)\b/.test(text)) {
    return { kind: "adjustLaneDensity", instrumentId: lane ?? "hat", direction: "sparser" };
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

function findLane(text: string): InstrumentId | null {
  for (const [pattern, instrumentId] of LANE_KEYWORDS) {
    if (pattern.test(text)) {
      return instrumentId;
    }
  }
  return null;
}

function findSection(text: string): ArrangementSectionId | null {
  for (const [pattern, sectionId] of SECTION_KEYWORDS) {
    if (pattern.test(text)) {
      return sectionId;
    }
  }
  return null;
}

function findBarCount(text: string): number | null {
  const numericMatch = /\b(\d{1,2})\s*bars?\b/.exec(text);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  for (const [word, value] of BAR_WORDS) {
    if (new RegExp(`\\b${word}\\s+bars?\\b`).test(text)) {
      return value;
    }
  }
  return null;
}
