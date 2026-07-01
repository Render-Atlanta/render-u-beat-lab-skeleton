import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import {
  RENDER_SAMPLE_RATE,
  renderPatternToPcm,
  renderedPatternLength,
} from "./styleRender";
import { INSTRUMENT_IDS, patternFromSteps, type InstrumentId } from "./patterns";
import { createDefaultStepVelocities } from "./stepVelocity";
import type { DecodedInstrumentVoice } from "./instrumentVoiceRender";

const EMPTY_STEPS: Record<InstrumentId, number[]> = {
  kick: [],
  snare: [],
  hat: [],
  openHat: [],
  clap: [],
  "808": [],
  bassGuitar: [],
  melody: [],
};

function constantVoice(fill: number): DecodedInstrumentVoice {
  return { notes: [{ frequency: 440, samples: new Float32Array(4000).fill(fill) }] };
}

describe("renderPatternToPcm", () => {
  const kit = loadKitFromDisk();

  it("produces a deterministic, non-silent, bounded buffer", () => {
    const a = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const b = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(RENDER_SAMPLE_RATE); // > ~1s
    // byte-identical across runs
    expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
    // non-silent and peak-bounded
    const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it("renderedPatternLength matches the actual rendered buffer length", () => {
    for (const id of ["trap", "crunk", "rnb"] as const) {
      const style = BEAT_STYLES[id];
      expect(renderedPatternLength(style)).toBe(
        renderPatternToPcm(style.pattern, style, kit).length,
      );
    }
  });

  it("renders longer buffers for slower tempos", () => {
    const fast = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const slow = renderPatternToPcm(BEAT_STYLES.crunk.pattern, BEAT_STYLES.crunk, kit);
    expect(slow.length).toBeGreaterThan(fast.length); // crunk 96bpm > trap 142bpm bar length
  });

  it("clamps negative swing to zero, matching engine behavior", () => {
    const negSwing = { ...BEAT_STYLES.trap, swing: -0.2 };
    const zeroSwing = { ...BEAT_STYLES.trap, swing: 0 };
    const neg = renderPatternToPcm(BEAT_STYLES.trap.pattern, negSwing, kit);
    const zero = renderPatternToPcm(BEAT_STYLES.trap.pattern, zeroSwing, kit);
    // Clamping negative swing to 0 must produce byte-identical output
    expect(Array.from(neg)).toEqual(Array.from(zero));
  });

  it("throws when a required sampled lane is missing from the kit", () => {
    const kitWithoutKick: Partial<typeof kit> = { ...kit };
    delete kitWithoutKick.kick;

    expect(() =>
      renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kitWithoutKick as typeof kit),
    ).toThrow("Missing kit sample for kick");
  });

  it("scales each rendered hit by its step velocity", () => {
    const kickSteps = patternFromSteps({
      kick: [2, 3],
      snare: [],
      hat: [],
      openHat: [],
      clap: [],
      "808": [],
      bassGuitar: [],
      melody: [],
    });
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[1] = 0;
    stepVelocities.kick[2] = 2;
    const simpleKit = {
      kick: new Float32Array([1]),
      snare: new Float32Array([1]),
      hat: new Float32Array([1]),
      openHat: new Float32Array([1]),
      clap: new Float32Array([1]),
      "808": new Float32Array([1]),
    };

    const pcm = renderPatternToPcm(
      kickSteps,
      { ...BEAT_STYLES.trap, swing: 0, stepVelocities },
      simpleKit,
      ["kick"],
    );
    const stepSamples = Math.round((60 / BEAT_STYLES.trap.bpm / 4) * RENDER_SAMPLE_RATE);

    expect(pcm[stepSamples * 2] / pcm[stepSamples]).toBeCloseTo(1.45 / 0.55, 3);
  });

  it("renders the melody lane from a sampled voice when one is provided", () => {
    const melodySteps = patternFromSteps({ ...EMPTY_STEPS, melody: [1] });
    const style = { ...BEAT_STYLES.trap, swing: 0 };

    const synth = renderPatternToPcm(melodySteps, style, kit, INSTRUMENT_IDS);
    const sampled = renderPatternToPcm(melodySteps, style, kit, INSTRUMENT_IDS, {
      melody: constantVoice(0.5),
    });

    // The sampled voice must actually change the melody render vs. the synth...
    expect(Array.from(sampled)).not.toEqual(Array.from(synth));
    // ...and stay audible.
    const peak = sampled.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    expect(peak).toBeGreaterThan(0.1);
  });

  it("renders the bassGuitar lane from a sampled voice when one is provided", () => {
    const bassSteps = patternFromSteps({ ...EMPTY_STEPS, bassGuitar: [1] });
    const style = { ...BEAT_STYLES.trap, swing: 0 };

    const synth = renderPatternToPcm(bassSteps, style, kit, INSTRUMENT_IDS);
    const sampled = renderPatternToPcm(bassSteps, style, kit, INSTRUMENT_IDS, {
      bassGuitar: constantVoice(0.5),
    });

    expect(Array.from(sampled)).not.toEqual(Array.from(synth));
    const peak = sampled.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    expect(peak).toBeGreaterThan(0.1);
  });

  it("is deterministic and voice-specific for sampled melody voices", () => {
    const melodySteps = patternFromSteps({ ...EMPTY_STEPS, melody: [1] });
    const style = { ...BEAT_STYLES.trap, swing: 0 };
    const rampVoice: DecodedInstrumentVoice = {
      notes: [
        {
          frequency: 440,
          samples: new Float32Array(Array.from({ length: 4000 }, (_, i) => (i % 100) / 100)),
        },
      ],
    };

    const a1 = renderPatternToPcm(melodySteps, style, kit, INSTRUMENT_IDS, {
      melody: constantVoice(0.5),
    });
    const a2 = renderPatternToPcm(melodySteps, style, kit, INSTRUMENT_IDS, {
      melody: constantVoice(0.5),
    });
    const b = renderPatternToPcm(melodySteps, style, kit, INSTRUMENT_IDS, {
      melody: rampVoice,
    });

    expect(Array.from(a1)).toEqual(Array.from(a2)); // deterministic
    expect(Array.from(a1)).not.toEqual(Array.from(b)); // voice-specific
  });
});
