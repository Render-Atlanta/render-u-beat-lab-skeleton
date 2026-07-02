import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAME_TRACK_SPECS,
  buildGameTrackProject,
  buildGameTrackArrangement,
  buildGameTrackSequencer,
  type GameTrackSpec,
} from "./gameTracks";
import { importProjectJson, exportProjectJson, getArrangementBarCount } from "./arrangement";
import { BEAT_STYLES } from "./beatStyles";
import { melodyStepPitchesAreDefault } from "./stepPitch";

const EXPECTED_SLUGS = ["airport", "connector", "badge", "vendor", "mainStage", "afterparty"];

describe("GAME_TRACK_SPECS", () => {
  it("covers the six stage slugs exactly once", () => {
    const slugs = GAME_TRACK_SPECS.map((s) => s.slug).sort();
    expect(slugs).toEqual([...EXPECTED_SLUGS].sort());
  });

  it("uses only valid bpm (60-180) and >=1 bars", () => {
    for (const spec of GAME_TRACK_SPECS) {
      expect(spec.bpm).toBeGreaterThanOrEqual(60);
      expect(spec.bpm).toBeLessThanOrEqual(180);
      expect(spec.bars).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps genres per the design", () => {
    const map = Object.fromEntries(GAME_TRACK_SPECS.map((s) => [s.slug, s.styleId]));
    expect(map).toMatchObject({
      airport: "afrobeats", connector: "trap", badge: "rnb",
      vendor: "bounce", mainStage: "crunk", afterparty: "amapiano",
    });
  });
});

describe("buildGameTrackProject", () => {
  it("produces a project that round-trips through export/import", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const project = buildGameTrackProject(spec);
      const result = importProjectJson(exportProjectJson(project));
      expect(result.ok, `${spec.slug}: ${(result as { errors?: string[] }).errors?.join(" ")}`).toBe(true);
    }
  });

  it("extends only the main section to spec.bars", () => {
    const spec = GAME_TRACK_SPECS.find((s) => s.slug === "airport")!;
    const arrangement = buildGameTrackArrangement(spec);
    const main = arrangement.sections.find((sec) => sec.id === "main")!;
    expect(main.bars).toBe(spec.bars);
    // all four sections still present (validator requirement)
    expect(arrangement.sections.map((s) => s.id).sort()).toEqual(["intro", "main", "outro", "variation"]);
    expect(getArrangementBarCount(arrangement)).toBe(spec.bars + 3);
  });
});

describe("buildGameTrackSequencer melody overlay", () => {
  const specWithMelody: GameTrackSpec = {
    slug: "test", styleId: "afrobeats", bpm: 100, bars: 4,
    melody: [true, false, false, false, true, false, false, false,
             false, false, false, false, false, false, false, false],
    melodyStepPitches: [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  it("overlays the spec melody lane and pitches onto the sequencer", () => {
    const seq = buildGameTrackSequencer(specWithMelody);
    expect(seq.pattern.melody).toEqual(specWithMelody.melody);
    expect(seq.melodyStepPitches).toEqual(specWithMelody.melodyStepPitches);
    expect(seq.bpm).toBe(100);
  });

  it("leaves other lanes at the style default", () => {
    const seq = buildGameTrackSequencer(specWithMelody);
    expect(seq.pattern.kick).toEqual(BEAT_STYLES.afrobeats.pattern.kick);
  });

  it("does not mutate the shared BEAT_STYLES preset melody array", () => {
    const before = [...BEAT_STYLES.afrobeats.pattern.melody];
    buildGameTrackSequencer(specWithMelody);
    buildGameTrackSequencer(specWithMelody);
    expect(BEAT_STYLES.afrobeats.pattern.melody).toEqual(before);
  });

  it("stays a beat bed (empty melody) when the spec has no topline", () => {
    const seq = buildGameTrackSequencer({ slug: "x", styleId: "trap", bpm: 140, bars: 4 });
    expect(seq.pattern.melody.some(Boolean)).toBe(false);
  });
});

describe("GAME_TRACK_SPECS toplines", () => {
  it("every stage has a length-16 melody with at least one active step", () => {
    for (const spec of GAME_TRACK_SPECS) {
      expect(spec.melody, spec.slug).toBeDefined();
      expect(spec.melody!.length).toBe(16);
      expect(spec.melody!.filter(Boolean).length, spec.slug).toBeGreaterThanOrEqual(1);
      expect(spec.melodyStepPitches!.length).toBe(16);
    }
  });

  it("melodic stages carry non-default pitches", () => {
    const melodic = ["airport", "badge", "afterparty", "vendor"];
    for (const slug of melodic) {
      const spec = GAME_TRACK_SPECS.find((s) => s.slug === slug)!;
      expect(melodyStepPitchesAreDefault(spec.melodyStepPitches!), slug).toBe(false);
    }
  });

  it("the sequencer's active melody-step count matches the spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const seq = buildGameTrackSequencer(spec);
      expect(seq.pattern.melody.filter(Boolean).length, spec.slug)
        .toBe(spec.melody!.filter(Boolean).length);
    }
  });

  // Guards against editing a spec's topline without re-running
  // `npm run generate:game-tracks` — the committed JSON must stay in sync.
  it("the committed game-tracks JSON melody lanes match the specs", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const path = join(process.cwd(), "game-tracks", `${spec.slug}.beatlab.json`);
      const project = JSON.parse(readFileSync(path, "utf8"));
      expect(project.sequencer.pattern.melody, spec.slug).toEqual(spec.melody);
      expect(project.sequencer.melodyStepPitches, spec.slug).toEqual(spec.melodyStepPitches);
    }
  });
});
