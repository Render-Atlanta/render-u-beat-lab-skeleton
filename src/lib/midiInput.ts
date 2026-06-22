import type { InstrumentId } from "./patterns";
import type { StepVelocity } from "./stepVelocity";

export interface MidiNoteTrigger {
  note: number;
  noteName: string;
  velocity: number;
  stepVelocity: StepVelocity;
  instrument: InstrumentId;
}

export const MIDI_NOTE_TO_INSTRUMENT: Readonly<Record<number, InstrumentId>> = {
  35: "kick",
  36: "kick",
  38: "snare",
  40: "snare",
  42: "hat",
  44: "hat",
  46: "openHat",
  39: "clap",
  41: "808",
  43: "808",
  45: "bassGuitar",
  47: "bassGuitar",
  48: "melody",
  50: "melody",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function parseMidiNoteMessage(data: ArrayLike<number>): MidiNoteTrigger | null {
  if (data.length < 3) {
    return null;
  }

  const status = data[0] & 0xf0;
  const note = data[1];
  const velocity = data[2];
  if (status !== 0x90 || velocity <= 0) {
    return null;
  }

  const instrument = mapMidiNoteToInstrument(note);
  if (!instrument) {
    return null;
  }

  return {
    note,
    noteName: midiNoteName(note),
    velocity,
    stepVelocity: midiVelocityToStepVelocity(velocity),
    instrument,
  };
}

export function mapMidiNoteToInstrument(note: number): InstrumentId | null {
  return MIDI_NOTE_TO_INSTRUMENT[note] ?? null;
}

export function midiVelocityToStepVelocity(velocity: number): StepVelocity {
  if (velocity >= 100) {
    return 2;
  }
  if (velocity <= 45) {
    return 0;
  }
  return 1;
}

export function midiNoteName(note: number): string {
  const rounded = Math.round(note);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function getNextMidiRecordStep(stepIndex: number): number {
  return (Math.max(0, Math.min(15, Math.round(stepIndex))) + 1) % 16;
}

export function resolveMidiRecordStep(
  activeStep: number | null,
  recordStep: number,
  followPlayhead: boolean,
): number {
  if (followPlayhead && activeStep !== null) {
    return Math.max(0, Math.min(15, Math.round(activeStep)));
  }

  return Math.max(0, Math.min(15, Math.round(recordStep)));
}
