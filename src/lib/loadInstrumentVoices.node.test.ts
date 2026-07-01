import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeWav } from "./wav";
import { RENDER_SAMPLE_RATE } from "./styleRender";
import { noteNameToFrequency } from "./instrumentVoiceRender";
import {
  decodeVoiceNotes,
  loadInstrumentVoicesFromDisk,
} from "./loadInstrumentVoices.node";
import { createDefaultLaneVoiceSelection } from "./laneVoiceSelection";

let publicDir: string;

beforeAll(() => {
  publicDir = mkdtempSync(join(tmpdir(), "beatlab-voices-"));
  mkdirSync(join(publicDir, "instruments", "piano"), { recursive: true });
  writeFileSync(
    join(publicDir, "instruments/piano/C4.wav"),
    encodeWav(new Float32Array([0.1, 0.2, 0.3]), RENDER_SAMPLE_RATE),
  );
  writeFileSync(
    join(publicDir, "instruments/piano/C5.wav"),
    encodeWav(new Float32Array([0.4, 0.5]), RENDER_SAMPLE_RATE),
  );
});

afterAll(() => {
  rmSync(publicDir, { recursive: true, force: true });
});

describe("decodeVoiceNotes", () => {
  it("decodes each note's WAV and tags it with the note's frequency", () => {
    const voice = decodeVoiceNotes(
      { C4: "/instruments/piano/C4.wav", C5: "/instruments/piano/C5.wav" },
      publicDir,
    );
    expect(voice).not.toBeNull();
    expect(voice?.notes).toHaveLength(2);
    const c4 = voice?.notes.find(
      (n) => Math.abs(n.frequency - noteNameToFrequency("C4")) < 0.01,
    );
    expect(c4).toBeDefined();
    expect(c4?.samples.length).toBe(3);
  });

  it("returns null when any sample file is missing (voice falls back to synth)", () => {
    const voice = decodeVoiceNotes(
      { C4: "/instruments/piano/C4.wav", E4: "/instruments/piano/E4.wav" },
      publicDir,
    );
    expect(voice).toBeNull();
  });

  it("returns null (does not throw) when a sample is at the wrong rate", () => {
    mkdirSync(join(publicDir, "instruments", "offrate"), { recursive: true });
    writeFileSync(
      join(publicDir, "instruments/offrate/C4.wav"),
      encodeWav(new Float32Array([0.1, 0.2]), 44100), // not RENDER_SAMPLE_RATE
    );
    // Degrades to the synth voice rather than aborting the whole export.
    expect(decodeVoiceNotes({ C4: "/instruments/offrate/C4.wav" }, publicDir)).toBeNull();
  });

  it("returns null (does not throw) when a sample file is corrupt", () => {
    mkdirSync(join(publicDir, "instruments", "corrupt"), { recursive: true });
    writeFileSync(
      join(publicDir, "instruments/corrupt/C4.wav"),
      Buffer.from("this is not a valid RIFF/WAVE file"),
    );
    expect(decodeVoiceNotes({ C4: "/instruments/corrupt/C4.wav" }, publicDir)).toBeNull();
  });
});

describe("loadInstrumentVoicesFromDisk", () => {
  it("returns an empty map for the all-synth default selection", () => {
    const voices = loadInstrumentVoicesFromDisk(
      createDefaultLaneVoiceSelection(),
      publicDir,
    );
    expect(voices).toEqual({});
  });
});
