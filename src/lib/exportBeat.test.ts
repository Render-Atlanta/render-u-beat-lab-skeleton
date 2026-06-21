import { describe, expect, it } from "vitest";
import {
  ARRANGEMENT_SECTION_IDS,
  createDefaultArrangement,
  setSectionBars,
  setSectionLaneMuted,
} from "./arrangement";
import { BEAT_STYLES } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { createDefaultLaneVolumes } from "./laneVolumes";
import { createDefaultSequencerState } from "./patternState";
import {
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
  updateBassStepPitch,
  updateMelodyStepPitch,
} from "./stepPitch";
import { patternFromSteps } from "./patterns";
import { renderPatternToPcm } from "./styleRender";
import { decodeWav } from "./wav";
import { renderArrangementWav, renderBeatWav } from "./exportBeat";
import { createPlayableStyle } from "./sequencerDomain";

describe("renderBeatWav", () => {
  const kit = loadKitFromDisk();

  it("encodes a valid WAV whose length scales with loops", () => {
    const one = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 1 }));
    const two = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2 }));
    expect(one.sampleRate).toBe(22050);
    expect(two.samples.length).toBeGreaterThan(one.samples.length);
  });

  it("mixes a recorded tag in so the output is not identical to drums-only", () => {
    const drumsOnly = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2 }));
    const tag = new Float32Array(2205).fill(0.3); // ~0.1s tone
    const withTag = decodeWav(renderBeatWav({
      pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2,
      tag: { samples: tag, trigger: "intro" },
    }));
    let differs = false;
    for (let i = 0; i < Math.min(2205, drumsOnly.samples.length); i += 1) {
      if (Math.abs(withTag.samples[i] - drumsOnly.samples[i]) > 1e-4) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  it("does not truncate a loop tag that extends past the drum tail", () => {
    // Use 2 loops. The "loop" trigger fires at offset 0 and offset loopSamples.
    // If the tag is longer than bar.length - loopSamples (the drum decay tail),
    // it would be clipped without the buffer-extension fix.
    const loopSamples = Math.round((60 / BEAT_STYLES.trap.bpm / 4) * 16 * 22050);
    const longTag = new Float32Array(loopSamples + 4410).fill(0.5); // extends well past drum tail
    const result = decodeWav(renderBeatWav({
      pattern: BEAT_STYLES.trap.pattern,
      style: BEAT_STYLES.trap,
      kit,
      loops: 2,
      tag: { samples: longTag, trigger: "loop" },
    }));
    // The decoded WAV must cover at least loopSamples (last loop offset) + longTag.length
    const minExpected = loopSamples + longTag.length;
    expect(result.samples.length).toBeGreaterThanOrEqual(minExpected);
    // And the last sample of the tag must NOT be zero (i.e. not truncated)
    const lastTagSample = result.samples[loopSamples + longTag.length - 1];
    expect(lastTagSample).not.toBeCloseTo(0, 3);
  });

  it("renders arrangement bar counts instead of a fixed two-loop repeat", () => {
    const sequencer = createDefaultSequencerState("trap");
    const fourBars = decodeWav(renderArrangementWav({
      sequencer,
      style: createPlayableStyle(sequencer),
      kit,
      arrangement: createDefaultArrangement(),
    }));
    const extended = setSectionBars(createDefaultArrangement(), "main", 4);
    const sevenBars = decodeWav(renderArrangementWav({
      sequencer,
      style: createPlayableStyle(sequencer),
      kit,
      arrangement: extended,
    }));

    expect(sevenBars.samples.length).toBeGreaterThan(fourBars.samples.length);
  });

  it("honors section lane mutes in arrangement WAV export", () => {
    const baseSequencer = createDefaultSequencerState("trap");
    const sequencer = {
      ...baseSequencer,
      pattern: patternFromSteps({
        kick: [1],
        snare: [],
        hat: [],
        openHat: [],
        clap: [],
        "808": [],
        bassGuitar: [],
        melody: [],
      }),
    };
    const mutedArrangement = ARRANGEMENT_SECTION_IDS.reduce(
      (current, sectionId) => setSectionLaneMuted(current, sectionId, "kick", true),
      createDefaultArrangement(),
    );
    const rendered = decodeWav(renderArrangementWav({
      sequencer,
      style: createPlayableStyle(sequencer),
      kit,
      arrangement: mutedArrangement,
    }));

    const energy = rendered.samples.reduce((total, sample) => total + Math.abs(sample), 0);
    expect(energy).toBe(0);
  });

  it("silences a muted lane in the exported PCM", () => {
    const kickOnly = patternFromSteps({
      kick: [1],
      snare: [],
      hat: [],
      openHat: [],
      clap: [],
      "808": [],
      bassGuitar: [],
      melody: [],
    });
    const audible = renderPatternToPcm(kickOnly, BEAT_STYLES.trap, kit);
    const muted = renderPatternToPcm(kickOnly, {
      ...BEAT_STYLES.trap,
      laneVolumes: { ...createDefaultLaneVolumes(), kick: 0 },
    }, kit);

    let audibleEnergy = 0;
    let mutedEnergy = 0;
    for (let i = 0; i < audible.length; i += 1) {
      audibleEnergy += Math.abs(audible[i]);
      mutedEnergy += Math.abs(muted[i]);
    }

    expect(audibleEnergy).toBeGreaterThan(0);
    expect(mutedEnergy).toBe(0);
  });

  it("includes pitched bass notes in the exported PCM and respects lane volume", () => {
    const bassOnly = patternFromSteps({
      kick: [],
      snare: [],
      hat: [],
      openHat: [],
      clap: [],
      "808": [1],
      bassGuitar: [],
      melody: [],
    });
    const rootStyle = {
      ...BEAT_STYLES.trap,
      bassStepPitches: createDefaultBassStepPitches(),
    };
    const pitchedStyle = {
      ...rootStyle,
      bassStepPitches: updateBassStepPitch(createDefaultBassStepPitches(), 0, 2, 7),
    };
    const rootPcm = renderPatternToPcm(bassOnly, rootStyle, kit);
    const pitchedPcm = renderPatternToPcm(bassOnly, pitchedStyle, kit);
    const mutedPcm = renderPatternToPcm(bassOnly, {
      ...pitchedStyle,
      laneVolumes: { ...createDefaultLaneVolumes(), "808": 0 },
    }, kit);

    let rootEnergy = 0;
    let pitchedEnergy = 0;
    let mutedEnergy = 0;
    for (let i = 0; i < rootPcm.length; i += 1) {
      rootEnergy += Math.abs(rootPcm[i]);
      pitchedEnergy += Math.abs(pitchedPcm[i]);
      mutedEnergy += Math.abs(mutedPcm[i]);
    }

    expect(rootEnergy).toBeGreaterThan(0);
    expect(pitchedEnergy).toBeGreaterThan(0);
    expect(Array.from(rootPcm.slice(0, 64)).join(",")).not.toBe(
      Array.from(pitchedPcm.slice(0, 64)).join(","),
    );
    expect(mutedEnergy).toBe(0);
  });

  it("includes in-key melody notes in the exported PCM and respects lane volume", () => {
    const melodyOnly = patternFromSteps({
      kick: [],
      snare: [],
      hat: [],
      openHat: [],
      clap: [],
      "808": [],
      bassGuitar: [],
      melody: [1],
    });
    const rootStyle = {
      ...BEAT_STYLES.trap,
      melodyStepPitches: createDefaultMelodyStepPitches(),
    };
    const pitchedStyle = {
      ...rootStyle,
      melodyStepPitches: updateMelodyStepPitch(
        createDefaultMelodyStepPitches(),
        0,
        2,
        7,
      ),
    };
    const rootPcm = renderPatternToPcm(melodyOnly, rootStyle, kit);
    const pitchedPcm = renderPatternToPcm(melodyOnly, pitchedStyle, kit);
    const mutedPcm = renderPatternToPcm(melodyOnly, {
      ...pitchedStyle,
      laneVolumes: { ...createDefaultLaneVolumes(), melody: 0 },
    }, kit);

    let rootEnergy = 0;
    let pitchedEnergy = 0;
    let mutedEnergy = 0;
    for (let i = 0; i < rootPcm.length; i += 1) {
      rootEnergy += Math.abs(rootPcm[i]);
      pitchedEnergy += Math.abs(pitchedPcm[i]);
      mutedEnergy += Math.abs(mutedPcm[i]);
    }

    expect(rootEnergy).toBeGreaterThan(0);
    expect(pitchedEnergy).toBeGreaterThan(0);
    expect(Array.from(rootPcm.slice(0, 64)).join(",")).not.toBe(
      Array.from(pitchedPcm.slice(0, 64)).join(","),
    );
    expect(mutedEnergy).toBe(0);
  });
});
