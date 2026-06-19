import { describe, expect, it } from "vitest";
import {
  createArrangementPlaybackSections,
  createBeatLabProject,
  createDefaultArrangement,
  exportProjectJson,
  importProjectJson,
  isLaneMutedInSection,
  reconstructProjectState,
  setSectionLaneMuted,
  toggleSectionLaneMute,
  validateProjectExport,
} from "./arrangement";
import { createDefaultSequencerState, togglePatternStep } from "./patternState";
import { updateBassStepPitch } from "./stepPitch";

describe("arrangement helpers", () => {
  it("creates the four workshop arrangement sections in playback order", () => {
    expect(createDefaultArrangement()).toEqual({
      sections: [
        {
          id: "intro",
          label: "Intro",
          bars: 1,
          mutedLanes: ["snare", "openHat"],
        },
        { id: "main", label: "Main", bars: 1, mutedLanes: [] },
        { id: "variation", label: "Variation", bars: 1, mutedLanes: ["kick"] },
        {
          id: "outro",
          label: "Outro",
          bars: 1,
          mutedLanes: ["hat", "openHat"],
        },
      ],
    });
  });

  it("mutes section lanes without mutating the base sequencer pattern", () => {
    const sequencer = createDefaultSequencerState("trap");
    const sections = createArrangementPlaybackSections(
      sequencer,
      createDefaultArrangement(),
    );

    expect(sections.map((section) => section.id)).toEqual([
      "intro",
      "main",
      "variation",
      "outro",
    ]);
    expect(sections[0].pattern.snare).toEqual(Array.from({ length: 16 }, () => false));
    expect(sections[0].pattern.openHat).toEqual(
      Array.from({ length: 16 }, () => false),
    );
    expect(sections[1].pattern).toEqual(sequencer.pattern);
    expect(sections[2].pattern.kick).toEqual(Array.from({ length: 16 }, () => false));
    expect(sequencer.pattern.snare).toEqual(
      Array.from({ length: 16 }, (_, index) => index === 8),
    );
  });

  it("sets and toggles lane mutes immutably with deterministic lane ordering", () => {
    const arrangement = createDefaultArrangement();
    const withHatMuted = setSectionLaneMuted(arrangement, "main", "hat", true);
    const withKickMuted = setSectionLaneMuted(withHatMuted, "main", "kick", true);
    const withHatUnmuted = toggleSectionLaneMute(withKickMuted, "main", "hat");

    expect(arrangement.sections[1].mutedLanes).toEqual([]);
    expect(withKickMuted.sections[1].mutedLanes).toEqual(["kick", "hat"]);
    expect(isLaneMutedInSection(withKickMuted, "main", "hat")).toBe(true);
    expect(withHatUnmuted.sections[1].mutedLanes).toEqual(["kick"]);
    expect(isLaneMutedInSection(withHatUnmuted, "main", "hat")).toBe(false);
  });

  it("exports and imports project JSON that reconstructs sequencer and tag state", () => {
    const baseSequencer = createDefaultSequencerState("rnb");
    const sequencer = {
      ...baseSequencer,
      bpm: 82,
      swing: 0.21,
      pattern: togglePatternStep(baseSequencer.pattern, "kick", 1),
    };
    const arrangement = setSectionLaneMuted(
      createDefaultArrangement(),
      "main",
      "openHat",
      true,
    );
    const project = createBeatLabProject({
      sequencer,
      arrangement,
      producerTag: {
        enabled: true,
        text: "  Render   U   exclusive  ",
        trigger: "intro",
        effects: { rate: 0.7, pitch: 1.2, volume: 0.6 },
      },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }

    expect(result.project).toEqual({
      kind: "render-u-beat-lab/project",
      version: 1,
      sequencer,
      producerTag: {
        enabled: true,
        text: "Render U exclusive",
        trigger: "intro",
        effects: { rate: 0.7, pitch: 1.2, volume: 0.6 },
        source: "text",
      },
      arrangement,
    });
  });

  it("roundtrips a project with a loop trigger through export and import", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { trigger: "loop", source: "recorded" },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }

    expect(result.project.producerTag.trigger).toBe("loop");
    expect(result.project.producerTag.source).toBe("recorded");
  });

  it("validates project imports before reconstruction", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("pop"),
      producerTag: { text: "Render U made this" },
    });
    const badProject = {
      ...project,
      version: 99,
      sequencer: {
        ...project.sequencer,
        bpm: 400,
        pattern: {
          ...project.sequencer.pattern,
          hat: project.sequencer.pattern.hat.slice(0, 15),
        },
      },
      arrangement: {
        sections: [
          ...project.arrangement.sections,
          { id: "main", label: "Duplicate", bars: 1, mutedLanes: [] },
        ],
      },
    };

    const result = validateProjectExport(badProject);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected import validation to fail");
    }
    expect(result.errors).toContain("Project version must be 1.");
    expect(result.errors).toContain("Sequencer bpm must be from 60 to 180.");
    expect(result.errors).toContain(
      "Sequencer pattern.hat must be an array of 16 booleans.",
    );
    expect(result.errors).toContain(
      "Arrangement sections must not contain duplicate ids.",
    );
  });

  it("rejects arrangement sections with malformed labels during import", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const [intro, ...restSections] = project.arrangement.sections;
    const badProject = {
      ...project,
      arrangement: {
        sections: [{ ...intro, label: 42 }, ...restSections],
      },
    };

    const result = validateProjectExport(badProject);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected import validation to fail");
    }
    expect(result.errors).toContain("Arrangement section 1 label must be a string.");
  });

  it("reports invalid JSON and keeps strict reconstruction errors explicit", () => {
    expect(importProjectJson("{nope")).toEqual({
      ok: false,
      errors: ["Project JSON could not be parsed."],
    });

    expect(() =>
      reconstructProjectState({
        ...createBeatLabProject({
          sequencer: createDefaultSequencerState("trap"),
          producerTag: { text: "Render U made this" },
        }),
        kind: "wrong-kind" as "render-u-beat-lab/project",
      }),
    ).toThrow(/Invalid project export/);
  });

  it("defaults missing producerTag.source to text for backward-compat with older project JSON", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.producerTag.source;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.producerTag.source).toBe("text");
  });

  it("rejects a genuinely-invalid producerTag.source value", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    parsed.producerTag.source = "bogus";
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected import to fail for invalid source");
    }
    expect(result.errors).toContain("Producer tag source must be text or recorded.");
  });

  it("defaults missing sequencer.laneVolumes to 1 for backward-compat with older project JSON", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.sequencer.laneVolumes;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.laneVolumes).toEqual(
      createDefaultSequencerState("trap").laneVolumes,
    );
  });

  it("defaults missing sequencer.bassStepPitches to the root degree for backward-compat", () => {
    const project = createBeatLabProject({
      sequencer: createDefaultSequencerState("trap"),
      producerTag: { text: "Render U made this" },
    });
    const parsed = JSON.parse(exportProjectJson(project, { pretty: false }));
    delete parsed.sequencer.bassStepPitches;
    const result = importProjectJson(JSON.stringify(parsed));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.bassStepPitches).toEqual(
      createDefaultSequencerState("trap").bassStepPitches,
    );
  });

  it("round-trips non-default bass step pitches through project JSON", () => {
    const baseSequencer = createDefaultSequencerState("trap");
    const bassStepPitches = updateBassStepPitch(
      updateBassStepPitch(baseSequencer.bassStepPitches, 0, 2, 7),
      6,
      4,
      7,
    );
    const project = createBeatLabProject({
      sequencer: {
        ...baseSequencer,
        bassStepPitches,
      },
    });

    const result = importProjectJson(exportProjectJson(project, { pretty: false }));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.project.sequencer.bassStepPitches).toEqual(bassStepPitches);
  });
});
