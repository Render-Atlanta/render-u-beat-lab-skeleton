import { describe, it, expect } from "vitest";
import {
  noteNameToFrequency,
  pickNearestNote,
  renderSampledNotePcm,
  type DecodedInstrumentVoice,
  type DecodedVoiceNote,
} from "./instrumentVoiceRender";

function note(frequency: number, fill = 0): DecodedVoiceNote {
  return { frequency, samples: new Float32Array([fill]) };
}

describe("noteNameToFrequency", () => {
  it("maps A4 to 440 Hz", () => {
    expect(noteNameToFrequency("A4")).toBeCloseTo(440, 5);
  });

  it("maps middle C (C4) to ~261.63 Hz", () => {
    expect(noteNameToFrequency("C4")).toBeCloseTo(261.6256, 3);
  });

  it("treats sharps written as '#' and 's' the same (G#3 === Gs3)", () => {
    expect(noteNameToFrequency("G#3")).toBeCloseTo(noteNameToFrequency("Gs3"), 6);
  });
});

describe("pickNearestNote", () => {
  const notes = [note(200), note(400), note(800)];

  it("returns the exact note when the target matches", () => {
    expect(pickNearestNote(notes, 400).frequency).toBe(400);
  });

  it("picks the nearest note by pitch ratio, not linear distance", () => {
    // 560 Hz: linearly closer to 400 (160) than 800 (240), but by pitch ratio
    // it is closer to 800 (0.51 semitone-decades) than 400 (0.49)... use 566 to
    // land on the log midpoint side of 800.
    expect(pickNearestNote(notes, 570).frequency).toBe(800);
  });

  it("clamps to the lowest note below the range", () => {
    expect(pickNearestNote(notes, 50).frequency).toBe(200);
  });
});

describe("renderSampledNotePcm", () => {
  it("plays the recorded sample unchanged when the target matches the note", () => {
    const voice: DecodedInstrumentVoice = {
      notes: [{ frequency: 440, samples: new Float32Array([1, 0.5, 0.25, 0.125]) }],
    };
    // sampleRate 4, hold 10s => hold window (40) far exceeds the 4-sample source,
    // so the whole source plays at full gain and nothing is pitch-shifted.
    const out = renderSampledNotePcm(voice, 440, 10, 4);
    expect(Array.from(out)).toEqual([1, 0.5, 0.25, 0.125]);
  });

  it("pitch-shifts up an octave by resampling at 2x playback rate", () => {
    const voice: DecodedInstrumentVoice = {
      notes: [{ frequency: 220, samples: new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]) }],
    };
    // target 440 = one octave above the 220 note => ratio 2 => out[j] = src[2j].
    const out = renderSampledNotePcm(voice, 440, 10, 4);
    expect(Array.from(out)).toEqual([0, 2, 4, 6]);
  });

  it("applies a release envelope so the note decays to silence", () => {
    const voice: DecodedInstrumentVoice = {
      notes: [{ frequency: 440, samples: new Float32Array(100).fill(1) }],
    };
    // sampleRate 100 => hold 0.1s = 10 samples; release adds a decaying tail.
    const out = renderSampledNotePcm(voice, 440, 0.1, 100);
    expect(out[9]).toBeCloseTo(1, 6); // last hold sample: full gain
    expect(out[10]).toBeLessThan(1); // release has begun
    expect(out[out.length - 1]).toBeCloseTo(0, 6); // decays to silence
  });

  it("returns an empty buffer for a voice with no notes (no crash)", () => {
    const out = renderSampledNotePcm({ notes: [] }, 440, 0.1, 100);
    expect(out.length).toBe(0);
  });

  it("returns an empty buffer for a non-positive target frequency (no crash)", () => {
    const voice = constantVoice;
    expect(renderSampledNotePcm(voice, -440, 0.1, 100).length).toBe(0);
    expect(renderSampledNotePcm(voice, 0, 0.1, 100).length).toBe(0);
  });

  it("returns an empty buffer when the source note frequency is zero (no NaN)", () => {
    const zeroFreq: DecodedInstrumentVoice = {
      notes: [{ frequency: 0, samples: new Float32Array(100).fill(1) }],
    };
    const out = renderSampledNotePcm(zeroFreq, 440, 0.1, 100);
    expect(out.length).toBe(0);
    expect(out.every((x) => Number.isFinite(x))).toBe(true);
  });
});

const constantVoice: DecodedInstrumentVoice = {
  notes: [{ frequency: 440, samples: new Float32Array(100).fill(0.5) }],
};
