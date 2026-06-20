import { describe, expect, it } from "vitest";
import { createDefaultSequencerState } from "./patternState";
import {
  clearSequencerPitchedStep,
  setSequencerPitchedStepNote,
} from "./pianoRoll";
import type { PitchedInstrumentId } from "./sequencerDomain";

const PITCHED: { id: PitchedInstrumentId; pitchKey: "bassStepPitches" | "bassGuitarStepPitches" | "melodyStepPitches" }[] = [
  { id: "808", pitchKey: "bassStepPitches" },
  { id: "bassGuitar", pitchKey: "bassGuitarStepPitches" },
  { id: "melody", pitchKey: "melodyStepPitches" },
];

describe("pianoRoll", () => {
  for (const { id, pitchKey } of PITCHED) {
    describe(id, () => {
      it("places a note: turns the step on and sets its pitch", () => {
        const base = createDefaultSequencerState("trap");
        const next = setSequencerPitchedStepNote(base, id, 3, 2);

        expect(next.pattern[id][3]).toBe(true);
        expect(next[pitchKey][3]).toBe(2);
      });

      it("moves a note: keeps the step on and changes only its pitch", () => {
        const base = createDefaultSequencerState("trap");
        const placed = setSequencerPitchedStepNote(base, id, 5, 0);
        const moved = setSequencerPitchedStepNote(placed, id, 5, 4);

        expect(moved.pattern[id][5]).toBe(true);
        expect(moved[pitchKey][5]).toBe(4);
      });

      it("clears a step: turns it off but leaves the stored pitch intact", () => {
        const base = createDefaultSequencerState("trap");
        const placed = setSequencerPitchedStepNote(base, id, 7, 3);
        const cleared = clearSequencerPitchedStep(placed, id, 7);

        expect(cleared.pattern[id][7]).toBe(false);
        expect(cleared[pitchKey][7]).toBe(3);
      });

      it("clamps an out-of-range degree into the palette", () => {
        const base = createDefaultSequencerState("trap");
        const next = setSequencerPitchedStepNote(base, id, 1, 99);

        // Palettes are 7-note scales (degrees 0–6).
        expect(next[pitchKey][1]).toBe(6);
      });

      it("does not mutate the input sequencer", () => {
        const base = createDefaultSequencerState("trap");
        const beforeOn = base.pattern[id][9];
        const beforePitch = base[pitchKey][9];

        setSequencerPitchedStepNote(base, id, 9, 5);

        expect(base.pattern[id][9]).toBe(beforeOn);
        expect(base[pitchKey][9]).toBe(beforePitch);
      });
    });
  }

  it("leaves the other lanes untouched when editing one lane", () => {
    const base = createDefaultSequencerState("trap");
    const next = setSequencerPitchedStepNote(base, "melody", 2, 4);

    expect(next.pattern.kick).toEqual(base.pattern.kick);
    expect(next.pattern["808"]).toEqual(base.pattern["808"]);
    expect(next.bassStepPitches).toEqual(base.bassStepPitches);
    expect(next.bassGuitarStepPitches).toEqual(base.bassGuitarStepPitches);
  });
});
