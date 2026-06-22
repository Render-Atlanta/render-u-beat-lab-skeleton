import type { BeatStyleId } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";
import {
  DEFAULT_SAMPLE_KIT_ID,
  type SampleKitId,
} from "../lib/sampleKitSelection";

export {
  DEFAULT_SAMPLE_KIT_ID,
  SAMPLE_KIT_IDS,
  type SampleKitId,
} from "../lib/sampleKitSelection";

// melody and bassGuitar are synthesized (pitched lanes), not sampled.
export type SampleKitLane = Exclude<InstrumentId, "melody" | "bassGuitar">;
export type SampleKitUrls = Record<SampleKitLane, string>;

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
export const REQUIRED_LANES: readonly SampleKitLane[] = [
  "kick",
  "snare",
  "hat",
  "openHat",
  "clap",
  "808",
];

export interface KitPiece {
  /** Lane this piece feeds. */
  lane: SampleKitLane;
  /** Human-friendly piece name. */
  name: string;
  /** Public URL the engine loads (served from public/). */
  url: string;
}

export interface SampleKitOption {
  id: SampleKitId;
  name: string;
  description: string;
}

export const SAMPLE_KIT_OPTIONS: readonly SampleKitOption[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Balanced workshop kit.",
  },
  {
    id: "punchy",
    name: "Punchy",
    description: "Shorter hits with more front edge.",
  },
  {
    id: "airy",
    name: "Airy",
    description: "Brighter hits with a small room tail.",
  },
];

/** The default kit every style starts from. */
export const DEFAULT_KIT: Record<SampleKitLane, KitPiece> = createKit("classic", "");

export const SAMPLE_KITS: Record<SampleKitId, Record<SampleKitLane, KitPiece>> = {
  classic: DEFAULT_KIT,
  punchy: createKit("punchy", "punchy"),
  airy: createKit("airy", "airy"),
};

function createKit(id: SampleKitId, directory: string): Record<SampleKitLane, KitPiece> {
  const prefix = directory ? `/kit/${directory}` : "/kit";
  const label = SAMPLE_KIT_OPTIONS.find((option) => option.id === id)?.name ?? "Kit";
  return {
    kick: { lane: "kick", name: `${label} Kick`, url: `${prefix}/kick.wav` },
    snare: { lane: "snare", name: `${label} Snare`, url: `${prefix}/snare.wav` },
    hat: { lane: "hat", name: `${label} Closed Hat`, url: `${prefix}/hat.wav` },
    openHat: { lane: "openHat", name: `${label} Open Hat`, url: `${prefix}/openHat.wav` },
    clap: { lane: "clap", name: `${label} Clap`, url: `${prefix}/clap.wav` },
    "808": { lane: "808", name: `${label} 808`, url: `${prefix}/808.wav` },
  };
}

/**
 * Per-style lane overrides. Empty today (all styles share the default kit),
 * but the shape lets a style swap in a different one-shot for any lane without
 * touching the engine.
 */
export const STYLE_KIT_OVERRIDES: Partial<
  Record<BeatStyleId, Partial<Record<SampleKitLane, KitPiece>>>
> = {};

/**
 * Resolve the effective kit pieces for a style (or the default kit when no
 * style is given), applying any per-style overrides.
 */
export function getKitPieces(
  styleId?: BeatStyleId,
  kitId: SampleKitId = DEFAULT_SAMPLE_KIT_ID,
): Record<SampleKitLane, KitPiece> {
  const overrides = styleId ? STYLE_KIT_OVERRIDES[styleId] ?? {} : {};
  const kit = SAMPLE_KITS[kitId] ?? SAMPLE_KITS[DEFAULT_SAMPLE_KIT_ID];
  return {
    kick: overrides.kick ?? kit.kick,
    snare: overrides.snare ?? kit.snare,
    hat: overrides.hat ?? kit.hat,
    openHat: overrides.openHat ?? kit.openHat,
    clap: overrides.clap ?? kit.clap,
    "808": overrides["808"] ?? kit["808"],
  };
}

/**
 * The ToneSampleUrls map the tone-sample engine consumes: every required lane
 * mapped to its sample URL for the given style.
 */
export function getKitSampleUrls(
  styleId?: BeatStyleId,
  kitId: SampleKitId = DEFAULT_SAMPLE_KIT_ID,
): SampleKitUrls {
  const pieces = getKitPieces(styleId, kitId);
  return {
    kick: pieces.kick.url,
    snare: pieces.snare.url,
    hat: pieces.hat.url,
    openHat: pieces.openHat.url,
    clap: pieces.clap.url,
    "808": pieces["808"].url,
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
export function validateKit(
  styleId?: BeatStyleId,
  kitId: SampleKitId = DEFAULT_SAMPLE_KIT_ID,
): KitManifestIssue[] {
  const urls = getKitSampleUrls(styleId, kitId);
  const issues: KitManifestIssue[] = [];
  for (const lane of REQUIRED_LANES) {
    const url = urls[lane];
    if (!url || url.trim() === "") {
      issues.push({ styleId, lane, reason: "missing or empty URL" });
    }
  }
  return issues;
}
