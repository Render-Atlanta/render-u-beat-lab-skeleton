import { patternFromSteps, type Pattern } from "./patterns";

export type BeatStyleId = "trap" | "crunk" | "drill" | "rnb" | "pop";

export interface BeatStyle {
  id: BeatStyleId;
  name: string;
  bpm: number;
  swing: number;
  pattern: Pattern;
  lesson: string;
}

export const BEAT_STYLES: Record<BeatStyleId, BeatStyle> = {
  trap: {
    id: "trap",
    name: "Trap starter",
    bpm: 142,
    swing: 0.08,
    pattern: patternFromSteps({
      kick: [1, 7, 11, 15],
      snare: [5, 13],
      hat: [1, 3, 5, 7, 9, 10, 11, 12, 13, 15],
      openHat: [8, 16],
    }),
    lesson:
      "Trap often feels fast because the hats move, while the snare anchors the backbeat. Start simple: kick choices create the bounce.",
  },
  crunk: {
    id: "crunk",
    name: "Crunk chant",
    bpm: 96,
    swing: 0.04,
    pattern: patternFromSteps({
      kick: [1, 4, 7, 11],
      snare: [5, 13],
      hat: [1, 3, 5, 7, 9, 11, 13, 15],
      openHat: [16],
    }),
    lesson:
      "Crunk patterns leave space for chants and crowd response. The pocket is direct: heavy kick, clear snare, no overthinking.",
  },
  drill: {
    id: "drill",
    name: "Drill slide",
    bpm: 144,
    swing: 0.12,
    pattern: patternFromSteps({
      kick: [1, 6, 10, 12, 15],
      snare: [9],
      hat: [1, 3, 5, 6, 7, 9, 11, 13, 14, 15],
      openHat: [4, 12],
    }),
    lesson:
      "Drill can put the snare in a less expected place. The offset backbeat makes the groove feel like it is leaning sideways.",
  },
  rnb: {
    id: "rnb",
    name: "R&B pocket",
    bpm: 74,
    swing: 0.18,
    pattern: patternFromSteps({
      kick: [1, 8, 11],
      snare: [5, 13],
      hat: [1, 4, 7, 10, 13, 16],
      openHat: [12],
    }),
    lesson:
      "R&B gives the groove room to breathe. Fewer hits plus more swing can feel more human than filling every step.",
  },
  pop: {
    id: "pop",
    name: "Pop bounce",
    bpm: 118,
    swing: 0.02,
    pattern: patternFromSteps({
      kick: [1, 7, 11],
      snare: [5, 13],
      hat: [1, 3, 5, 7, 9, 11, 13, 15],
      openHat: [8, 16],
    }),
    lesson:
      "Pop patterns are built to read quickly. Keep the backbeat familiar, then use texture and arrangement to make it yours.",
  },
};
