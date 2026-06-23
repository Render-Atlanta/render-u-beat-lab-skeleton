import { describe, expect, it } from "vitest";
import {
  createDefaultArrangement,
  setSectionBars,
  setSectionLaneMuted,
  type Arrangement,
} from "./arrangement";
import { createDefaultSequencerState, togglePatternStep } from "./patternState";
import {
  createSongSectionStyle,
  formatSongPosition,
  getSongPosition,
  getUpcomingSectionChange,
  isLoopWrap,
} from "./songPlayback";

/** A four-section song with distinct, non-default bar lengths for boundary tests. */
function multiBarArrangement(): Arrangement {
  let arrangement = createDefaultArrangement();
  arrangement = setSectionBars(arrangement, "intro", 2);
  arrangement = setSectionBars(arrangement, "main", 4);
  arrangement = setSectionBars(arrangement, "variation", 1);
  arrangement = setSectionBars(arrangement, "outro", 3);
  return arrangement;
}

describe("getSongPosition", () => {
  it("reports the first section at bar 1 when nothing has elapsed", () => {
    const arrangement = multiBarArrangement();
    const position = getSongPosition(arrangement, 0);

    expect(position).toEqual({
      sectionId: "intro",
      label: "Intro",
      barInSong: 1,
      totalBars: 10,
      mutedLanes: ["snare", "openHat"],
    });
  });

  it("advances bar-within-song while staying in the same section", () => {
    const arrangement = multiBarArrangement();
    // intro spans bars 1-2, so barsElapsed 1 is still the intro at bar 2.
    expect(getSongPosition(arrangement, 1)).toMatchObject({
      sectionId: "intro",
      barInSong: 2,
    });
  });

  it("crosses into the next section at the section boundary", () => {
    const arrangement = multiBarArrangement();
    // intro = 2 bars (indices 0,1); the 3rd bar (index 2) is the first main bar.
    expect(getSongPosition(arrangement, 2)).toMatchObject({
      sectionId: "main",
      barInSong: 3,
      mutedLanes: [],
    });
  });

  it("locates the final section's last bar", () => {
    const arrangement = multiBarArrangement();
    // Cumulative: intro 2, main 4 (->6), variation 1 (->7), outro 3 (->10).
    // The last song bar (index 9) is the outro's third bar.
    expect(getSongPosition(arrangement, 9)).toMatchObject({
      sectionId: "outro",
      barInSong: 10,
      totalBars: 10,
    });
  });

  it("wraps back to the first section after the last bar", () => {
    const arrangement = multiBarArrangement();
    // 10 bars total: barsElapsed 10 wraps to song bar 1 (intro again).
    expect(getSongPosition(arrangement, 10)).toMatchObject({
      sectionId: "intro",
      barInSong: 1,
    });
    // One past the intro on the second pass is still the intro's 2nd bar.
    expect(getSongPosition(arrangement, 11)).toMatchObject({
      sectionId: "intro",
      barInSong: 2,
    });
    // Deep into a later loop lands on the same place as the first pass.
    expect(getSongPosition(arrangement, 22)).toMatchObject({
      sectionId: "main",
      barInSong: 3,
    });
  });

  it("handles a single-bar-per-section song", () => {
    const arrangement = createDefaultArrangement(); // 1 bar each, 4 total.
    expect(getSongPosition(arrangement, 0)).toMatchObject({
      sectionId: "intro",
      barInSong: 1,
      totalBars: 4,
    });
    expect(getSongPosition(arrangement, 3)).toMatchObject({
      sectionId: "outro",
      barInSong: 4,
    });
    expect(getSongPosition(arrangement, 4)).toMatchObject({
      sectionId: "intro",
      barInSong: 1,
    });
  });
});

describe("createSongSectionStyle", () => {
  it("silences the section's muted lanes while keeping others audible", () => {
    let sequencer = createDefaultSequencerState("trap");
    // Force a kick and a snare hit so we can prove masking is selective.
    sequencer = { ...sequencer, pattern: togglePatternStep(sequencer.pattern, "kick", 0) };
    sequencer = { ...sequencer, pattern: togglePatternStep(sequencer.pattern, "snare", 4) };

    const style = createSongSectionStyle(sequencer, ["kick"]);

    expect(style.pattern.kick.some(Boolean)).toBe(false);
    // The snare hit we added survives because snare is not muted in this section.
    expect(style.pattern.snare[4]).toBe(true);
  });

  it("does not mutate the source sequencer pattern", () => {
    const sequencer = {
      ...createDefaultSequencerState("trap"),
      pattern: togglePatternStep(createDefaultSequencerState("trap").pattern, "kick", 0),
    };
    const before = sequencer.pattern.kick.slice();

    createSongSectionStyle(sequencer, ["kick"]);

    expect(sequencer.pattern.kick).toEqual(before);
  });

  it("carries tempo and swing from the sequencer", () => {
    const sequencer = { ...createDefaultSequencerState("trap"), bpm: 142, swing: 0.21 };
    const style = createSongSectionStyle(sequencer, []);

    expect(style.bpm).toBe(142);
    expect(style.swing).toBe(0.21);
  });
});

describe("isLoopWrap", () => {
  it("detects a wrap when the step index decreases between two real steps", () => {
    expect(isLoopWrap(15, 0)).toBe(true);
    expect(isLoopWrap(5, 3)).toBe(true); // a skipped/dropped-frame wrap still decreases
  });

  it("is not a wrap on a normal forward step", () => {
    expect(isLoopWrap(3, 7)).toBe(false);
    expect(isLoopWrap(0, 1)).toBe(false);
  });

  it("never treats a null transition as a wrap (start and restart gaps)", () => {
    expect(isLoopWrap(null, 0)).toBe(false); // playback start
    expect(isLoopWrap(0, null)).toBe(false); // restart gap / stop
    expect(isLoopWrap(null, null)).toBe(false);
  });
});

describe("getUpcomingSectionChange", () => {
  it("returns the next section at every boundary of a single-bar-per-section song", () => {
    const arrangement = createDefaultArrangement(); // intro/main/variation/outro, 1 bar each.
    expect(getUpcomingSectionChange(arrangement, 0)).toMatchObject({ sectionId: "main" });
    expect(getUpcomingSectionChange(arrangement, 1)).toMatchObject({ sectionId: "variation" });
    expect(getUpcomingSectionChange(arrangement, 2)).toMatchObject({ sectionId: "outro" });
  });

  it("wraps back to the first section after the final bar", () => {
    const arrangement = createDefaultArrangement();
    expect(getUpcomingSectionChange(arrangement, 3)).toMatchObject({ sectionId: "intro" });
  });

  it("returns null while the next bar stays in the same multi-bar section", () => {
    let arrangement = createDefaultArrangement();
    arrangement = setSectionBars(arrangement, "intro", 2);
    arrangement = setSectionBars(arrangement, "main", 4);
    // intro spans bars 0-1: bar 0's successor (bar 1) is still intro.
    expect(getUpcomingSectionChange(arrangement, 0)).toBeNull();
    // intro's last bar (1) hands off to main.
    expect(getUpcomingSectionChange(arrangement, 1)).toMatchObject({ sectionId: "main" });
    // main spans bars 2-5: mid-section successors stay in main.
    expect(getUpcomingSectionChange(arrangement, 2)).toBeNull();
    expect(getUpcomingSectionChange(arrangement, 4)).toBeNull();
    // main's last bar (5) hands off to variation.
    expect(getUpcomingSectionChange(arrangement, 5)).toMatchObject({ sectionId: "variation" });
  });

  it("carries the upcoming section's muted lanes for masking", () => {
    const arrangement = createDefaultArrangement();
    // variation mutes kick by default; the intro→main→variation boundary at bar 1
    // should surface variation's mutes one bar ahead.
    expect(getUpcomingSectionChange(arrangement, 1)?.mutedLanes).toEqual(["kick"]);
  });
});

describe("formatSongPosition", () => {
  it("renders the section label with a 1-based bar over the song total", () => {
    const arrangement = setSectionLaneMuted(
      createDefaultArrangement(),
      "main",
      "kick",
      true,
    );
    expect(formatSongPosition(getSongPosition(arrangement, 1))).toBe("Main · bar 2/4");
  });
});
