import type { LaneVolumes } from "./laneVolumes";
import { patternFromSteps, type Pattern } from "./patterns";
import type { BassStepPitches, MelodyStepPitches, NoteName, ScaleType } from "./stepPitch";

export interface MusicalKey {
  root: NoteName;
  scale: ScaleType;
}

export type BeatStyleId =
  | "trap"
  | "crunk"
  | "drill"
  | "rnb"
  | "pop"
  | "afrobeats"
  | "amapiano";

export interface BeatStyle {
  id: BeatStyleId;
  name: string;
  bpm: number;
  swing: number;
  pattern: Pattern;
  musicalKey: MusicalKey;
  laneVolumes?: LaneVolumes;
  bassStepPitches?: BassStepPitches;
  melodyStepPitches?: MelodyStepPitches;
  lesson: string;
}

export const BEAT_STYLES: Record<BeatStyleId, BeatStyle> = {
  trap: {
    id: "trap",
    name: "Atlanta trap pocket",
    bpm: 142,
    swing: 0.04,
    pattern: patternFromSteps({
      kick: [1, 4, 7, 11, 15],
      snare: [9],
      hat: [1, 3, 5, 7, 9, 10, 11, 12, 13, 15, 16],
      openHat: [6, 14],
      clap: [9],
      "808": [1, 7, 11],
      melody: [],
    }),
    musicalKey: { root: "A", scale: "minor" },
    lesson:
      "Atlanta trap often feels fast on top and slow in the body: rapid hats move around a half-time snare while the kick and 808 create the bounce.",
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
      clap: [5, 13],
      "808": [1, 7],
      melody: [],
    }),
    musicalKey: { root: "E", scale: "minor" },
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
      clap: [9],
      "808": [1, 10],
      melody: [],
    }),
    musicalKey: { root: "F#", scale: "minor" },
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
      clap: [5, 13],
      "808": [1, 8],
      melody: [],
    }),
    musicalKey: { root: "D", scale: "minor" },
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
      clap: [5, 13],
      "808": [1, 11],
      melody: [],
    }),
    musicalKey: { root: "C", scale: "major" },
    lesson:
      "Pop patterns are built to read quickly. Keep the backbeat familiar, then use texture and arrangement to make it yours.",
  },
  afrobeats: {
    id: "afrobeats",
    name: "Afrobeats bounce",
    bpm: 104,
    swing: 0.1,
    pattern: patternFromSteps({
      kick: [1, 4, 7, 11, 14],
      snare: [5, 13],
      hat: [1, 3, 6, 8, 10, 12, 15, 16],
      openHat: [7, 15],
      clap: [5, 13],
      "808": [1, 7, 14],
      melody: [],
    }),
    musicalKey: { root: "G", scale: "minor" },
    lesson:
      "Afrobeats lives in syncopation: the groove feels relaxed, but the kick and hats keep nudging you forward between the obvious beats.",
  },
  amapiano: {
    id: "amapiano",
    name: "Amapiano log pulse",
    bpm: 112,
    swing: 0.14,
    pattern: patternFromSteps({
      kick: [1, 9, 12, 15],
      snare: [5, 13],
      hat: [1, 4, 7, 10, 13, 16],
      openHat: [6, 11, 15],
      clap: [5, 13],
      "808": [1, 9, 12],
      melody: [],
    }),
    musicalKey: { root: "F", scale: "minor" },
    lesson:
      "Amapiano leaves air around the drums so the bass/log-drum idea can talk. Keep the pulse hypnotic and let accents answer each other.",
  },
};
