// src/game/rushController.ts
// Shared controller the Phaser scenes close over. Owns the beat list, progress,
// the active swim-lane layout, the folded note chart, and the audio (studio bed +
// hit SFX). Everything is derived from BEAT_STYLES at runtime — no hardcoded beats.
import { RushPlayback } from "./rushPlayback";
import { foldRhythmChart, type RushNote } from "./rushChart";
import { RUSH_BEATS, type RushBeat } from "./rushBeats";
import { activeLaneSet, type LaneSet } from "./laneConfig";
import { buildRhythmChart } from "../lib/rhythmChart";

export interface BeatProgress {
  score: number;
  stars: number;
  grade?: string;
}

const SAVE_KEY = "ratl-rush-beatlab-v1";

// One fixed, forgiving timing profile (difficulty is carved out of the skeleton).
const APPROACH_MS = 2400;
const PERFECT_MS = 120;
const GOOD_MS = 240;
const MISS_HP = 3;
const REGEN_PERFECT = 2.6;
const REGEN_GOOD = 1.5;

export class RushController {
  readonly ACCENT_PINK = 0xff5bd0;
  readonly W = 1000;
  readonly H = 1500;
  readonly HITY = 1195;
  readonly TAIL = 1400;

  readonly beats = RUSH_BEATS;
  readonly playback = new RushPlayback();

  readonly approachMs = APPROACH_MS;
  readonly perfectMs = PERFECT_MS;
  readonly goodMs = GOOD_MS;
  readonly missHp = MISS_HP;
  readonly regenP = REGEN_PERFECT;
  readonly regenG = REGEN_GOOD;

  progress: Record<string, BeatProgress> = {};
  selIdx = 0;

  beat!: RushBeat;
  laneSet: LaneSet = activeLaneSet();
  laneCount = this.laneSet.hex.length;
  get laneHex(): number[] { return this.laneSet.hex; }
  get laneCss(): string[] { return this.laneSet.css; }
  get laneKeys(): string[] { return this.laneSet.keys; }
  get laneTags(): string[] { return this.laneSet.tags; }

  notes: RushNote[] = [];
  lastNoteMs = 0;
  chartBpm = 120;

  constructor() {
    this.progress = this.loadProgress();
  }

  loadProgress(): Record<string, BeatProgress> {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "") || {}; } catch (e) { return {}; }
  }
  saveProgress(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress)); } catch (e) { /* ignore */ }
  }

  /**
   * Load the selected beat: derive + fold its chart from BEAT_STYLES and render the
   * studio bed. Async because the sample kit loads/decodes on first use. Must run on
   * a user gesture (audio unlock).
   */
  async prepare(): Promise<void> {
    this.beat = this.beats[this.selIdx];
    this.laneSet = activeLaneSet();
    this.laneCount = this.laneSet.hex.length;
    await this.playback.ensure();
    const chart = buildRhythmChart(this.beat.spec);
    this.chartBpm = chart.bpm;
    // Denser folds (fewer lanes) need a wider min-gap to stay playable.
    const minGapSteps = this.laneCount <= 2 ? 4 : 2;
    const folded = foldRhythmChart(chart, this.laneSet, minGapSteps);
    this.notes = folded.notes;
    this.lastNoteMs = folded.lastNoteMs;
    this.playback.prepareBed(this.beat.spec);
  }

  el(): number {
    return this.playback.elapsedMs();
  }

  /** Start the bed (lead-in = approachMs) and schedule the 3-2-1 count-in clicks. */
  startBeat(): void {
    this.playback.start(this.approachMs);
    const bd = 60000 / this.chartBpm;
    for (let i = 3; i >= 1; i--) this.playback.countInClick(-bd * i, false);
    this.playback.countInClick(0, true);
  }
  stopBeat(): void {
    this.playback.stop();
  }
}
