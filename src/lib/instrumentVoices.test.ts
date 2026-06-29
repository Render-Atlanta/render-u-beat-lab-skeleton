import { describe, expect, it } from "vitest";
import { SYNTH_VOICE_ID, VOICED_LANES } from "./laneVoiceSelection";
import {
  INSTRUMENT_VOICES,
  getLaneVoiceOptions,
  isLaneVoiceId,
  normalizeLaneVoiceSelection,
  getLaneVoiceSamples,
  getSelectedLaneVoiceSamples,
} from "./instrumentVoices";

describe("instrument voice manifest", () => {
  it("offers the synth voice first for every voiced lane", () => {
    for (const lane of VOICED_LANES) {
      const options = getLaneVoiceOptions(lane);
      expect(options.length).toBeGreaterThan(1);
      expect(options[0].id).toBe(SYNTH_VOICE_ID);
    }
  });

  it("the synth voice carries no samples; sampled voices do", () => {
    for (const voice of INSTRUMENT_VOICES) {
      if (voice.id === SYNTH_VOICE_ID) {
        expect(voice.samples).toBeNull();
      } else {
        expect(voice.samples && Object.keys(voice.samples).length).toBeGreaterThan(0);
      }
    }
  });

  it("every sampled voice records a source and license", () => {
    for (const voice of INSTRUMENT_VOICES) {
      if (voice.id === SYNTH_VOICE_ID) continue;
      expect(voice.source).toBeTruthy();
      expect(voice.license).toBe("CC0");
    }
  });

  it("validates voice ids per lane", () => {
    expect(isLaneVoiceId("melody", SYNTH_VOICE_ID)).toBe(true);
    expect(isLaneVoiceId("melody", "definitely-not-a-voice")).toBe(false);
  });

  it("normalize drops unknown ids back to synth", () => {
    expect(
      normalizeLaneVoiceSelection({ melody: "definitely-not-a-voice" }),
    ).toEqual({ melody: SYNTH_VOICE_ID, bassGuitar: SYNTH_VOICE_ID });
  });

  it("getLaneVoiceSamples returns null for synth and a map otherwise", () => {
    expect(getLaneVoiceSamples("melody", SYNTH_VOICE_ID)).toBeNull();
    const firstSampled = getLaneVoiceOptions("melody").find(
      (v) => v.id !== SYNTH_VOICE_ID,
    )!;
    expect(getLaneVoiceSamples("melody", firstSampled.id)).not.toBeNull();
  });

  it("getSelectedLaneVoiceSamples includes only non-synth lanes", () => {
    const firstSampled = getLaneVoiceOptions("melody").find(
      (v) => v.id !== SYNTH_VOICE_ID,
    )!;
    const result = getSelectedLaneVoiceSamples({
      melody: firstSampled.id,
      bassGuitar: SYNTH_VOICE_ID,
    });
    expect(result.melody).toBeDefined();
    expect(result.bassGuitar).toBeUndefined();
  });
});
