import { describe, expect, it } from "vitest";
import {
  GAME_TRACK_SPECS,
  buildGameTrackProject,
  buildGameTrackArrangement,
} from "./gameTracks";
import { importProjectJson, exportProjectJson, getArrangementBarCount } from "./arrangement";

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
