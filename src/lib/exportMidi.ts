import type { BeatStyle } from "./beatStyles";
import {
  createArrangementPlaybackSections,
  type Arrangement,
} from "./arrangement";
import { getBassGuitarPitchForStep } from "./bassGuitarPitch";
import { getLaneVolumes } from "./laneVolumes";
import { INSTRUMENT_IDS, type InstrumentId, type Pattern } from "./patterns";
import type { SequencerState } from "./patternState";
import { getBassPitchForStep, getMelodyPitchForStep } from "./stepPitch";
import { getStepVelocities, type StepVelocities } from "./stepVelocity";
import {
  DEFAULT_PPQ,
  encodeMidiFile,
  type MidiNoteEvent,
  type MidiTrackSpec,
} from "./midiFile";

export interface RenderBeatMidiInput {
  pattern: Pattern;
  style: BeatStyle;
  loops?: number;
}

export interface RenderArrangementMidiInput {
  sequencer: SequencerState;
  style: BeatStyle;
  arrangement: Arrangement;
}

const STEPS = 16;
const STEP_TICKS = DEFAULT_PPQ / 4; // 16th-note grid

/** All drum lanes share the General MIDI percussion channel (10 / index 9). */
const DRUM_CHANNEL = 9;

/** StepVelocity 0|1|2 (ghost / normal / accent) → MIDI velocity. */
const VELOCITY_MIDI = [55, 100, 127] as const;

/** Gate length as a fraction of a 16th step: drums are one-shots so a short
 * gate is enough; pitched notes ring most of the step but stay separated. */
const DRUM_GATE_TICKS = Math.round(STEP_TICKS * 0.5);
const PITCH_GATE_TICKS = Math.round(STEP_TICKS * 0.9);

type LaneMidi =
  | { kind: "drum"; note: number }
  | {
      kind: "pitched";
      channel: number;
      /** General MIDI program so a player picks a sound near the in-app voice. */
      program: number;
      label: string;
      midiFor: (style: BeatStyle, step: number) => number;
    };

interface PatternSegment {
  pattern: Pattern;
  loops: number;
}

/**
 * MIDI mapping for every lane, keyed by `InstrumentId`. Because this is a
 * `Record<InstrumentId, …>`, adding a new lane to `INSTRUMENT_IDS` is a compile
 * error here until it gets a mapping — the export can't silently drop a lane.
 */
const LANE_MIDI: Record<InstrumentId, LaneMidi> = {
  kick: { kind: "drum", note: 36 }, // Bass Drum 1
  snare: { kind: "drum", note: 38 }, // Acoustic Snare
  hat: { kind: "drum", note: 42 }, // Closed Hi-Hat
  openHat: { kind: "drum", note: 46 }, // Open Hi-Hat
  clap: { kind: "drum", note: 39 }, // Hand Clap
  "808": {
    kind: "pitched",
    channel: 0,
    program: 38, // Synth Bass 1
    label: "808",
    midiFor: (style, step) =>
      getBassPitchForStep(style.musicalKey, step, style.bassStepPitches).midi,
  },
  bassGuitar: {
    kind: "pitched",
    channel: 1,
    program: 33, // Electric Bass (finger)
    label: "Bass Gtr",
    midiFor: (style, step) =>
      getBassGuitarPitchForStep(style.musicalKey, step, style.bassGuitarStepPitches).midi,
  },
  melody: {
    kind: "pitched",
    channel: 2,
    program: 80, // Lead 1 (square)
    label: "Melody",
    midiFor: (style, step) =>
      getMelodyPitchForStep(style.musicalKey, step, style.melodyStepPitches).midi,
  },
};

/** Render the beat to Standard MIDI File bytes — `loops` bars of 4/4 16ths,
 * swing and per-step velocity mirrored from playback. */
export function renderBeatMidi(input: RenderBeatMidiInput): Uint8Array {
  const { pattern, style } = input;
  const loops = Math.max(1, Math.floor(input.loops ?? 2));
  return renderPatternSegmentsMidi([{ pattern, loops }], style);
}

/** Render a multi-section arrangement to MIDI, honoring section lane mutes. */
export function renderArrangementMidi(input: RenderArrangementMidiInput): Uint8Array {
  const segments = createArrangementPlaybackSections(
    input.sequencer,
    input.arrangement,
  ).map((section) => ({
    pattern: section.pattern,
    loops: section.bars,
  }));

  return renderPatternSegmentsMidi(segments, input.style);
}

function renderPatternSegmentsMidi(
  segments: PatternSegment[],
  style: BeatStyle,
): Uint8Array {
  const velocities = getStepVelocities(style);
  const laneVolumes = getLaneVolumes(style);
  const swing = Math.max(0, Math.min(0.5, style.swing));

  const drumNotes: MidiNoteEvent[] = [];
  const pitchedTracks: MidiTrackSpec[] = [];

  for (const id of INSTRUMENT_IDS) {
    // A muted lane (or one pulled to volume 0) is silent in playback/WAV
    // export, so it must not reappear in the MIDI. Mirrors styleRender.
    if (laneVolumes[id] === 0) continue;
    const lane = LANE_MIDI[id];
    if (lane.kind === "drum") {
      collectSegmentNotes(segments, id, (step, loop) => {
        drumNotes.push({
          channel: DRUM_CHANNEL,
          note: lane.note,
          velocity: velocityFor(velocities, id, step),
          startTick: startTick(step, loop, swing),
          durationTicks: DRUM_GATE_TICKS,
        });
      });
    } else {
      const notes: MidiNoteEvent[] = [];
      collectSegmentNotes(segments, id, (step, loop) => {
        const start = startTick(step, loop, swing);
        notes.push({
          channel: lane.channel,
          note: lane.midiFor(style, step),
          velocity: velocityFor(velocities, id, step),
          startTick: start,
          durationTicks: pitchGateTicks(step, loop, swing),
        });
      });
      if (notes.length > 0) {
        pitchedTracks.push({
          name: lane.label,
          program: { channel: lane.channel, program: lane.program },
          notes,
        });
      }
    }
  }

  // Drums first (one shared track), then each pitched lane in canonical order.
  const tracks: MidiTrackSpec[] = [];
  if (drumNotes.length > 0) tracks.push({ name: "Drums", notes: drumNotes });
  tracks.push(...pitchedTracks);

  return encodeMidiFile(tracks, { bpm: style.bpm });
}

function collectSegmentNotes(
  segments: PatternSegment[],
  id: InstrumentId,
  emit: (step: number, loop: number) => void,
): void {
  let loopOffset = 0;
  for (const segment of segments) {
    const row = segment.pattern[id];
    if (!row) {
      loopOffset += segment.loops;
      continue;
    }
    for (let loop = 0; loop < segment.loops; loop += 1) {
      for (let step = 0; step < STEPS; step += 1) {
        if (row[step]) emit(step, loopOffset + loop);
      }
    }
    loopOffset += segment.loops;
  }
}

/** Step start in ticks, with odd 16ths delayed by the swing fraction — the same
 * shape `styleRender` uses for audio (`i*stepSec + (odd ? swing*stepSec : 0)`). */
function startTick(step: number, loop: number, swing: number): number {
  const swingOffset = step % 2 === 1 ? Math.round(swing * STEP_TICKS) : 0;
  return loop * STEPS * STEP_TICKS + step * STEP_TICKS + swingOffset;
}

/** Start tick of the step after `step` — the next step in this bar, or the
 * downbeat of the next bar when `step` is the last in the loop. */
function nextStartTick(step: number, loop: number, swing: number): number {
  return step < STEPS - 1
    ? startTick(step + 1, loop, swing)
    : startTick(0, loop + 1, swing);
}

/** Gate length for a pitched note, capped so a swung note never runs into the
 * next step on the same channel (which would hang/merge same-pitch notes in a
 * DAW). Exported for testing. */
export function pitchGateTicks(step: number, loop: number, swing: number): number {
  const span = nextStartTick(step, loop, swing) - startTick(step, loop, swing);
  return Math.min(PITCH_GATE_TICKS, Math.max(1, span - 1));
}

function velocityFor(velocities: StepVelocities, id: InstrumentId, step: number): number {
  const level = velocities[id]?.[step] ?? 1;
  return VELOCITY_MIDI[level] ?? VELOCITY_MIDI[1];
}
