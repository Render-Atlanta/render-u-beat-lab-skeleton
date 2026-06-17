import { describe, expect, it } from "vitest";
import {
  createArrangementPlaybackSections,
  createBeatLabProject,
  createDefaultArrangement,
  createUnsupportedWavExportResult,
  exportProjectJson,
  importProjectJson,
  isLaneMutedInSection,
  reconstructProjectState,
  setSectionLaneMuted,
  toggleSectionLaneMute,
  validateProjectExport,
} from "./arrangement";
import { createDefaultSequencerState, togglePatternStep } from "./patternState";

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
      },
      arrangement,
    });
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

  it("documents WAV export as unsupported until offline rendering is stable", () => {
    expect(createUnsupportedWavExportResult()).toEqual({
      ok: false,
      reason: "unsupported",
      message:
        "WAV export is reserved for a stable offline render path; export project JSON for now.",
    });
  });
});
