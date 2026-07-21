// src/game/rushBeats.ts
// The beats RenderATL Rush offers — derived entirely from the Beat Lab's own data.
//
// Two beats: a working reference (Atlanta Trap) and the workshop BUILD TARGET
// (Amapiano). Each references a GAME_TRACK_SPEC by slug and reads its display name
// from BEAT_STYLES, so implementing beatStyles.amapiano makes the Amapiano beat come
// alive in-game with nothing hardcoded here.
import { GAME_TRACK_SPECS, type GameTrackSpec } from "../lib/gameTracks";
import { BEAT_STYLES, type BeatStyleId } from "../lib/beatStyles";

export interface RushBeat {
  spec: GameTrackSpec;
  styleId: BeatStyleId;
  /** Display name from BEAT_STYLES (e.g. "Atlanta Trap", "Amapiano"). */
  name: string;
  accentHex: number;
  accentCss: string;
  /** True for the style attendees implement (Amapiano). */
  buildTarget?: boolean;
}

function specBySlug(slug: string): GameTrackSpec {
  const spec = GAME_TRACK_SPECS.find((s) => s.slug === slug);
  if (!spec) throw new Error(`RenderATL Rush: missing game-track spec "${slug}"`);
  return spec;
}

function beat(slug: string, accentHex: number, accentCss: string, buildTarget?: boolean): RushBeat {
  const spec = specBySlug(slug);
  return { spec, styleId: spec.styleId, name: BEAT_STYLES[spec.styleId].name, accentHex, accentCss, buildTarget };
}

/** Selectable beats, in display order. */
export const RUSH_BEATS: RushBeat[] = [
  beat("connector", 0xf95bd0, "#f95bd0"), // Atlanta Trap — working reference
  beat("afterparty", 0x26c3e8, "#26c3e8", true), // Amapiano — build target
];
