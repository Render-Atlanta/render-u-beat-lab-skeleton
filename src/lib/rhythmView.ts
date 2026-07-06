// src/lib/rhythmView.ts

// How far a note has travelled down the highway: 0 = just spawned (approachMs away),
// 1 = exactly on the judge line, >1 = past it. Multiply by the highway height for y.
export function noteProgress(timeMs: number, nowMs: number, approachMs: number): number {
  return 1 - (timeMs - nowMs) / approachMs;
}

// Visible from the moment it spawns until a little past the line (its good window),
// after which it has been judged/missed and should stop drawing.
export function isNoteVisible(
  timeMs: number,
  nowMs: number,
  approachMs: number,
  goodMs: number,
): boolean {
  const p = noteProgress(timeMs, nowMs, approachMs);
  return p >= 0 && timeMs + goodMs >= nowMs;
}

// A pressed key → lane index (case-insensitive), or null if it is not a game key.
export function keyToLane(key: string, keys: string[]): number | null {
  const i = keys.indexOf(key.toUpperCase());
  return i >= 0 ? i : null;
}
