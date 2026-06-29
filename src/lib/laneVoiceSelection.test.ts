import { describe, expect, it } from "vitest";
import {
  VOICED_LANES,
  SYNTH_VOICE_ID,
  createDefaultLaneVoiceSelection,
  cloneLaneVoiceSelection,
  laneVoiceSelectionIsDefault,
  serializeLaneVoiceSelection,
  deserializeLaneVoiceSelection,
} from "./laneVoiceSelection";

describe("lane voice selection", () => {
  it("voiced lanes are melody and bassGuitar", () => {
    expect([...VOICED_LANES]).toEqual(["melody", "bassGuitar"]);
  });

  it("defaults every voiced lane to the synth voice", () => {
    expect(createDefaultLaneVoiceSelection()).toEqual({
      melody: SYNTH_VOICE_ID,
      bassGuitar: SYNTH_VOICE_ID,
    });
    expect(laneVoiceSelectionIsDefault(createDefaultLaneVoiceSelection())).toBe(true);
  });

  it("clone is a deep copy", () => {
    const original = createDefaultLaneVoiceSelection();
    const copy = cloneLaneVoiceSelection(original);
    copy.melody = "piano";
    expect(original.melody).toBe(SYNTH_VOICE_ID);
  });

  it("round-trips a non-default selection", () => {
    const selection = { melody: "piano", bassGuitar: "electric" };
    const encoded = serializeLaneVoiceSelection(selection);
    expect(deserializeLaneVoiceSelection(encoded)).toEqual(selection);
  });

  it("deserialize returns null for malformed input", () => {
    expect(deserializeLaneVoiceSelection("garbage")).toBeNull();
    expect(deserializeLaneVoiceSelection(null)).toBeNull();
  });

  it("deserialize fills missing lanes with the synth default", () => {
    expect(deserializeLaneVoiceSelection("melody~piano")).toEqual({
      melody: "piano",
      bassGuitar: SYNTH_VOICE_ID,
    });
  });
});
