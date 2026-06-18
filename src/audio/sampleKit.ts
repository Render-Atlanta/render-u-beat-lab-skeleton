import type { BeatStyleId } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";
import type { ToneSampleUrls } from "./toneSampleBeatEngine";

// ---------------------------------------------------------------------------
// PR-13 sample kit manifest
//
// Maps the four required lanes (kick/snare/hat/openHat) to bundled CC0
// one-shots served from /kit/*.wav (Vite serves public/ at the site root).
// Styles share one default kit but a style CAN override any lane via
// STYLE_KIT_OVERRIDES; getKitSampleUrls() resolves the effective mapping.
//
// The samples are original works synthesized by scripts/generate-kit.ts and
// dedicated to the public domain (CC0). See public/kit/LICENSE.md.
// ---------------------------------------------------------------------------

/** The lanes the tone-sample engine must always be able to resolve. */
export const REQUIRED_LANES: readonly InstrumentId[] = [
  "kick",
  "snare",
  "hat",
  "openHat",
];

export interface KitPiece {
  /** Lane this piece feeds. */
  lane: InstrumentId;
  /** Human-friendly piece name. */
  name: string;
  /** Public URL the engine loads (served from public/). */
  url: string;
}

/** The default kit every style starts from. */
export const DEFAULT_KIT: Record<InstrumentId, KitPiece> = {
  kick: { lane: "kick", name: "Kit Kick", url: "/kit/kick.wav" },
  snare: { lane: "snare", name: "Kit Snare", url: "/kit/snare.wav" },
  hat: { lane: "hat", name: "Kit Closed Hat", url: "/kit/hat.wav" },
  openHat: { lane: "openHat", name: "Kit Open Hat", url: "/kit/openHat.wav" },
};

/**
 * Per-style lane overrides. Empty today (all styles share the default kit),
 * but the shape lets a style swap in a different one-shot for any lane without
 * touching the engine.
 */
export const STYLE_KIT_OVERRIDES: Partial<
  Record<BeatStyleId, Partial<Record<InstrumentId, KitPiece>>>
> = {};

/**
 * Resolve the effective kit pieces for a style (or the default kit when no
 * style is given), applying any per-style overrides.
 */
export function getKitPieces(
  styleId?: BeatStyleId,
): Record<InstrumentId, KitPiece> {
  const overrides = styleId ? STYLE_KIT_OVERRIDES[styleId] ?? {} : {};
  return {
    kick: overrides.kick ?? DEFAULT_KIT.kick,
    snare: overrides.snare ?? DEFAULT_KIT.snare,
    hat: overrides.hat ?? DEFAULT_KIT.hat,
    openHat: overrides.openHat ?? DEFAULT_KIT.openHat,
  };
}

/**
 * The ToneSampleUrls map the tone-sample engine consumes: every required lane
 * mapped to its sample URL for the given style.
 */
export function getKitSampleUrls(styleId?: BeatStyleId): ToneSampleUrls {
  const pieces = getKitPieces(styleId);
  return {
    kick: pieces.kick.url,
    snare: pieces.snare.url,
    hat: pieces.hat.url,
    openHat: pieces.openHat.url,
  };
}

export interface KitManifestIssue {
  styleId?: BeatStyleId;
  lane: InstrumentId;
  reason: string;
}

/**
 * Validate that the resolved kit for a style (or the default kit) covers every
 * required lane with a non-empty URL. Returns the list of problems (empty when
 * the manifest is sound).
 */
export function validateKit(styleId?: BeatStyleId): KitManifestIssue[] {
  const urls = getKitSampleUrls(styleId);
  const issues: KitManifestIssue[] = [];
  for (const lane of REQUIRED_LANES) {
    const url = urls[lane];
    if (!url || url.trim() === "") {
      issues.push({ styleId, lane, reason: "missing or empty URL" });
    }
  }
  return issues;
}
