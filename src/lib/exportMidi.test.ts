import { describe, expect, it } from "vitest";
import {
  createDefaultArrangement,
  setSectionBars,
  setSectionLaneMuted,
} from "./arrangement";
import type { BeatStyle } from "./beatStyles";
import { pitchGateTicks, renderArrangementMidi, renderBeatMidi } from "./exportMidi";
import { createDefaultLaneVolumes } from "./laneVolumes";
import { decodeMidiFile } from "./midiReader";
import { createDefaultSequencerState } from "./patternState";
import { patternFromSteps, type Pattern } from "./patterns";
import { createPlayableStyle } from "./sequencerDomain";
import { createDefaultStepVelocities } from "./stepVelocity";

const EMPTY_LANES = {
  kick: [],
  snare: [],
  hat: [],
  openHat: [],
  clap: [],
  "808": [],
  bassGuitar: [],
  melody: [],
};

function makeStyle(overrides: Partial<BeatStyle> & { pattern: Pattern }): BeatStyle {
  return {
    id: "trap",
    name: "Test",
    bpm: 120,
    swing: 0,
    musicalKey: { root: "C", scale: "minor" },
    lesson: "",
    ...overrides,
  };
}

describe("renderBeatMidi", () => {
  it("maps drum hits to GM percussion notes on channel 9, looped", () => {
    // kick on steps 1 and 5 (1-indexed) → grid indices 0 and 4.
    const pattern = patternFromSteps({ ...EMPTY_LANES, kick: [1, 5] });
    const style = makeStyle({ pattern });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 2 }));

    expect(decoded.tempoBpm).toBe(120);
    expect(decoded.tracks.map((t) => t.name)).toEqual(["Drums"]);
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 9, note: 36, velocity: 100, tick: 0 },
      { channel: 9, note: 36, velocity: 100, tick: 480 },
      { channel: 9, note: 36, velocity: 100, tick: 1920 }, // bar 2 starts at 16*120
      { channel: 9, note: 36, velocity: 100, tick: 2400 },
    ]);
  });

  it("emits pitched lanes on their own channel with the palette's MIDI note", () => {
    // 808 hit on step 1, default pitch = root of C minor in the 808 register (24).
    const pattern = patternFromSteps({ ...EMPTY_LANES, "808": [1], melody: [1] });
    const style = makeStyle({ pattern });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 1 }));

    expect(decoded.tracks.map((t) => t.name)).toEqual(["808", "Melody"]);
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 0, note: 24, velocity: 100, tick: 0 }, // 808 register offset 24
    ]);
    expect(decoded.tracks[1].noteOns).toEqual([
      { channel: 2, note: 48, velocity: 100, tick: 0 }, // melody register offset 48
    ]);
  });

  it("delays odd 16th steps by the swing fraction, like playback", () => {
    // kick on step 2 → odd grid index 1; swing 0.25 of a 120-tick step = +30.
    const pattern = patternFromSteps({ ...EMPTY_LANES, kick: [2] });
    const style = makeStyle({ pattern, swing: 0.25 });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 1 }));

    expect(decoded.tracks[0].noteOns[0].tick).toBe(150); // 120 + round(0.25 * 120)
  });

  it("maps step velocity (ghost/normal/accent) to MIDI velocity", () => {
    const pattern = patternFromSteps({ ...EMPTY_LANES, kick: [1, 2, 3] });
    const velocities = createDefaultStepVelocities();
    velocities.kick[0] = 0; // ghost
    velocities.kick[1] = 1; // normal
    velocities.kick[2] = 2; // accent
    const style = makeStyle({ pattern, stepVelocities: velocities });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 1 }));

    expect(decoded.tracks[0].noteOns.map((n) => n.velocity)).toEqual([55, 100, 127]);
  });

  it("omits lanes muted to volume 0, matching WAV export", () => {
    const pattern = patternFromSteps({ ...EMPTY_LANES, kick: [1], snare: [5] });
    const laneVolumes = createDefaultLaneVolumes();
    laneVolumes.kick = 0; // muted / pulled to silence
    const style = makeStyle({ pattern, laneVolumes });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 1 }));

    // Kick is silent in playback/WAV, so it must not appear in the MIDI either.
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 9, note: 38, velocity: 100, tick: 480 }, // snare only
    ]);
  });

  it("caps pitched-note gate so swung notes never overlap the next step", () => {
    // No swing: an even step rings the full 0.9-step gate (108 ticks).
    expect(pitchGateTicks(0, 0, 0)).toBe(108);
    // Max swing: odd step 1 starts at 180, next step at 240 → gate clamped to 59
    // so the note (180+59=239) ends before the next note-on at 240.
    expect(pitchGateTicks(1, 0, 0.5)).toBe(59);
  });

  it("omits tracks for silent lanes", () => {
    const pattern = patternFromSteps({ ...EMPTY_LANES, snare: [5] });
    const style = makeStyle({ pattern });

    const decoded = decodeMidiFile(renderBeatMidi({ pattern, style, loops: 1 }));

    // Only the Drums track (snare); no 808/Bass Gtr/Melody tracks.
    expect(decoded.tracks.map((t) => t.name)).toEqual(["Drums"]);
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 9, note: 38, velocity: 100, tick: 480 },
    ]);
  });

  it("renders arrangement bars and section mutes to MIDI", () => {
    const baseSequencer = createDefaultSequencerState("trap");
    const sequencer = {
      ...baseSequencer,
      pattern: patternFromSteps({ ...EMPTY_LANES, kick: [1] }),
    };
    const arrangement = setSectionBars(
      setSectionLaneMuted(
        setSectionLaneMuted(createDefaultArrangement(), "intro", "kick", true),
        "outro",
        "kick",
        true,
      ),
      "main",
      2,
    );

    const decoded = decodeMidiFile(renderArrangementMidi({
      sequencer,
      style: createPlayableStyle(sequencer),
      arrangement,
    }));

    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 9, note: 36, velocity: 100, tick: 1920 },
      { channel: 9, note: 36, velocity: 100, tick: 3840 },
    ]);
  });
});
