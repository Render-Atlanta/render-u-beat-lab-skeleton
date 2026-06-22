import { describe, expect, it } from "vitest";
import {
  getNextMidiRecordStep,
  mapMidiNoteToInstrument,
  midiNoteName,
  midiVelocityToStepVelocity,
  parseMidiNoteMessage,
  resolveMidiRecordStep,
} from "./midiInput";

describe("midi input helpers", () => {
  it("maps common drum pad notes to Beat Lab lanes", () => {
    expect(mapMidiNoteToInstrument(36)).toBe("kick");
    expect(mapMidiNoteToInstrument(38)).toBe("snare");
    expect(mapMidiNoteToInstrument(42)).toBe("hat");
    expect(mapMidiNoteToInstrument(46)).toBe("openHat");
    expect(mapMidiNoteToInstrument(39)).toBe("clap");
    expect(mapMidiNoteToInstrument(41)).toBe("808");
    expect(mapMidiNoteToInstrument(45)).toBe("bassGuitar");
    expect(mapMidiNoteToInstrument(48)).toBe("melody");
    expect(mapMidiNoteToInstrument(99)).toBeNull();
  });

  it("parses note-on messages and ignores note-off or unmapped notes", () => {
    expect(parseMidiNoteMessage([0x90, 36, 127])).toEqual({
      note: 36,
      noteName: "C2",
      velocity: 127,
      stepVelocity: 2,
      instrument: "kick",
    });
    expect(parseMidiNoteMessage([0x80, 36, 127])).toBeNull();
    expect(parseMidiNoteMessage([0x90, 36, 0])).toBeNull();
    expect(parseMidiNoteMessage([0x90, 99, 127])).toBeNull();
  });

  it("converts MIDI velocity into Beat Lab velocity levels", () => {
    expect(midiVelocityToStepVelocity(20)).toBe(0);
    expect(midiVelocityToStepVelocity(64)).toBe(1);
    expect(midiVelocityToStepVelocity(120)).toBe(2);
  });

  it("names notes and resolves the recording step", () => {
    expect(midiNoteName(60)).toBe("C4");
    expect(getNextMidiRecordStep(15)).toBe(0);
    expect(resolveMidiRecordStep(7, 2, true)).toBe(7);
    expect(resolveMidiRecordStep(null, 2, true)).toBe(2);
    expect(resolveMidiRecordStep(null, 99, false)).toBe(15);
  });
});
