import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  getInstrumentCoach,
  getStyleCoach,
  summarizePatternChange,
} from "./beatCoach";
import { patternFromSteps } from "./patterns";

describe("beat coach helpers", () => {
  it("explains each drum lane in plain English", () => {
    expect(getInstrumentCoach("kick")).toEqual({
      id: "kick",
      label: "Kick",
      role: "The low thump that tells your body where the groove lands.",
      editTip: "Add kicks for bounce; remove them when the beat needs more room.",
    });

    expect(getInstrumentCoach("snare").role).toContain("backbeat");
    expect(getInstrumentCoach("hat").label).toBe("Closed hat");
    expect(getInstrumentCoach("openHat").editTip).toContain("sparingly");
  });

  it("turns a style preset into compact coach metadata", () => {
    expect(getStyleCoach("rnb")).toEqual({
      id: "rnb",
      name: "R&B pocket",
      bpm: 74,
      swingPercent: 18,
      concept: "A softer groove can feel stronger when it leaves space.",
      feelNote: "Slow pulse, relaxed swing, light hats, warm kick placement.",
      tryThis: "Try deleting one kick and raising swing until the loop relaxes.",
    });

    expect(getStyleCoach("afrobeats")).toMatchObject({
      id: "afrobeats",
      name: "Afrobeats bounce",
      bpm: 104,
      swingPercent: 10,
      concept: "Syncopated drums can feel relaxed and forward at the same time.",
    });

    expect(getStyleCoach("amapiano")).toMatchObject({
      id: "amapiano",
      name: "Amapiano log pulse",
      bpm: 112,
      swingPercent: 14,
      concept: "A hypnotic pulse works when the drums leave room for the bass idea.",
    });
  });

  it("summarizes when an edited pattern gets denser", () => {
    const editedPattern = patternFromSteps({
      kick: [1, 3, 7, 11, 15],
      snare: [5, 13],
      hat: [1, 2, 3, 5, 7, 9, 10, 11, 12, 13, 15, 16],
      openHat: [8, 16],
    });

    expect(summarizePatternChange("trap", editedPattern)).toEqual({
      styleId: "trap",
      baseHitCount: 19,
      editedHitCount: 21,
      densityDelta: 2,
      densityLevel: "balanced",
      densitySummary:
        "Balanced: you added 2 hits, so the beat feels busier than Atlanta trap pocket.",
      pocketSummary:
        "The snare moved onto steps 5 and 13, so the groove feels more square.",
      instrumentSummaries: [
        "Kick: unchanged at 5 hits.",
        "Snare: up 1 to 2 hits.",
        "Hat: up 1 to 12 hits.",
        "Open hat: unchanged at 2 hits.",
      ],
      tryThis: "Try adding two hats in a row before the snare, then remove one kick.",
    });
  });

  it("summarizes when edits create more space and move the pocket", () => {
    const editedPattern = patternFromSteps({
      kick: [1, 11],
      snare: [9],
      hat: [1, 5, 9, 13],
      openHat: [],
    });

    expect(summarizePatternChange("pop", editedPattern)).toMatchObject({
      baseHitCount: 15,
      editedHitCount: 7,
      densityDelta: -8,
      densityLevel: "sparse",
      densitySummary:
        "Sparse: you removed 8 hits, so the beat feels more open than Pop bounce.",
      pocketSummary:
        "The snare moved away from steps 5 and 13, so the pocket feels less expected; fewer kicks leave more space; fewer hats make the top line breathe.",
      instrumentSummaries: [
        "Kick: down 1 to 2 hits.",
        "Snare: down 1 to 1 hit.",
        "Hat: down 4 to 4 hits.",
        "Open hat: down 2 to 0 hits.",
      ],
    });
  });

  it("recognizes unchanged preset density", () => {
    expect(summarizePatternChange("crunk", BEAT_STYLES.crunk.pattern).densitySummary).toBe(
      "Still open: 15 hits keeps the same density as Crunk chant.",
    );
  });
});
