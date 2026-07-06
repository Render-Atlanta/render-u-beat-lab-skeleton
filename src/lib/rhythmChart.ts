import type { GameTrackSpec } from "./gameTracks";
import { buildGameTrackArrangement, buildGameTrackSequencer } from "./gameTracks";
import { createPlayableStyle } from "./sequencerDomain";
import { createArrangementPlaybackSections } from "./arrangement";
import { getStepEvents, STEPS_PER_LOOP } from "../audio/transport";
import type { InstrumentId } from "./patterns";

export interface RhythmNote {
  lane: number;
  timeMs: number;
  snd: InstrumentId;
  degree?: number;
}

export interface RhythmChart {
  slug: string;
  styleId: string;
  bpm: number;
  swing: number;
  loopBars: number;
  durationMs: number;
  lanes: 4;
  notes: RhythmNote[];
}

// Instrument -> game lane. Multiple instruments share a lane (deduped per lane+time).
export const LANE_OF: Record<InstrumentId, number> = {
  kick: 0,
  snare: 1,
  clap: 1,
  hat: 2,
  openHat: 2,
  "808": 3,
  bassGuitar: 3,
  melody: 3,
};

// Priority when two instruments collide on the same lane+time: keep the more
// "primary" voice (drives the note's `snd`/`degree` label). Lower index wins.
const LANE_PRIORITY: InstrumentId[] = ["kick", "snare", "hat", "808", "melody", "bassGuitar", "openHat", "clap"];

export function buildRhythmChart(spec: GameTrackSpec): RhythmChart {
  const sequencer = buildGameTrackSequencer(spec);
  const arrangement = buildGameTrackArrangement(spec);
  const baseStyle = createPlayableStyle(sequencer);
  const sections = createArrangementPlaybackSections(sequencer, arrangement);

  // Note times must line up with the OFFLINE WAV renderer, not the live scheduler.
  // The WAV path (styleRender.ts `renderPatternToPcm`) places each step `i` of a bar
  // at `i*stepSec + (i%2===1 ? swing*stepSec : 0)` (offbeats delayed LATER), and
  // exportBeat.ts lays each absolute bar at `barIndex * 16 * stepSec` (bar length is
  // content-independent). We reproduce that exact formula here so the chart lines up
  // with the audible bed by construction. `getStepEvents` is still used, but only to
  // enumerate WHICH instruments/pitches fire on each step — never for timing.
  // Use the bpm/swing the WAV renderer actually uses (its `style` == baseStyle here).
  const stepSec = 60 / baseStyle.bpm / 4; // matches styleRender.ts stepSec
  const swing = Math.max(0, Math.min(0.5, baseStyle.swing)); // matches styleRender.ts clamp

  const byKey = new Map<string, RhythmNote>();
  let barIndex = 0; // absolute 0-based bar across all sections
  for (const section of sections) {
    // A per-section style whose pattern reflects this section's lane mutes, so
    // getStepEvents only reports instruments that actually sound in this section.
    const sectionStyle = { ...baseStyle, pattern: section.pattern };
    for (let bar = 0; bar < section.bars; bar++) {
      for (let step = 0; step < STEPS_PER_LOOP; step++) {
        const timeSec =
          barIndex * STEPS_PER_LOOP * stepSec +
          step * stepSec +
          (step % 2 === 1 ? swing * stepSec : 0);
        const timeMs = Math.round(timeSec * 1000);
        // getStepEvents only needs the pattern/step to enumerate active instruments;
        // its `time` argument is not read back here, so pass the computed time.
        const events = getStepEvents(sectionStyle, step, timeSec);
        for (const ev of events) {
          const lane = LANE_OF[ev.instrument];
          const key = `${lane}@${timeMs}`;
          const existing = byKey.get(key);
          const note: RhythmNote = { lane, timeMs, snd: ev.instrument };
          if (ev.pitch) note.degree = ev.pitch.degree;
          if (!existing || LANE_PRIORITY.indexOf(ev.instrument) < LANE_PRIORITY.indexOf(existing.snd)) {
            byKey.set(key, note);
          }
        }
      }
      barIndex += 1;
    }
  }

  const totalBars = barIndex;
  const notes = [...byKey.values()].sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  return {
    slug: spec.slug,
    styleId: spec.styleId,
    bpm: baseStyle.bpm,
    swing,
    loopBars: totalBars,
    durationMs: Math.round(totalBars * STEPS_PER_LOOP * stepSec * 1000),
    lanes: 4,
    notes,
  };
}

export function serializeRhythmChart(chart: RhythmChart): string {
  return `${JSON.stringify(chart)}\n`;
}
