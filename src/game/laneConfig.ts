// src/game/laneConfig.ts
// Swim-lane layouts for RenderATL Rush.
//
// WORKSHOP CARVE-OUT (lanes / difficulty): the skeleton ships ONLY the 2-lane
// layout. The 4-lane layout — one swim lane per drum family — is an attendee
// add-on. Define LANE_SET_4 to light it up; the game then uses the largest
// available lane count, so the board expands from 2 → 4 lanes on its own.
//
// The falling-note chart (see rushChart.ts) always has four source lanes:
//   0 = kick, 1 = snare/clap, 2 = hat/openHat, 3 = 808/bass/melody
// A LaneSet's `map` folds those four source lanes onto the swim lanes it draws.

export interface LaneSet {
  /** Fill/stroke colour per swim lane (0x-hex, for Phaser). */
  hex: number[];
  /** Same colours as CSS strings (for text). */
  css: string[];
  /** Keyboard key per swim lane. */
  keys: string[];
  /** Short label per swim lane. */
  tags: string[];
  /** Source chart lane (0–3) → swim lane index. */
  map: Record<number, number>;
}

/** Shipped in the skeleton: two lanes. LOW = kick + 808/bass; TOP = snare/clap + hats. */
export const LANE_SET_2: LaneSet = {
  hex: [0x29d17e, 0xf4485a],
  css: ["#29d17e", "#f4485a"],
  keys: ["F", "J"],
  tags: ["LOW", "TOP"],
  map: { 0: 0, 3: 0, 1: 1, 2: 1 },
};

// TODO(attendee): add the 4-lane layout so each drum gets its own swim lane.
// Acceptance: src/game/laneConfig.test.ts — four distinct colours, four distinct
// keys, tags ["KICK","SNARE","HAT","BASS"], and an identity map { 0:0, 1:1, 2:2, 3:3 }
// (each source chart lane lands on its own swim lane). Once defined, the game
// switches to 4 lanes automatically. Suggested layout to build:
//   hex: [0x29d17e, 0xf4485a, 0xffc61f, 0x46b4f7]
//   keys: ["D","F","J","K"]  tags: ["KICK","SNARE","HAT","BASS"]
//   map: { 0:0, 1:1, 2:2, 3:3 }
export const LANE_SET_4: LaneSet | null = null;

/** All defined lane sets, keyed by lane count. */
export function laneSetsByCount(): Record<number, LaneSet> {
  const sets: Record<number, LaneSet> = { 2: LANE_SET_2 };
  if (LANE_SET_4) sets[4] = LANE_SET_4;
  return sets;
}

/** The layout the game plays: the largest lane count that has been defined. */
export function activeLaneSet(): LaneSet {
  return LANE_SET_4 ?? LANE_SET_2;
}
