import type { BeatStyleId } from "./beatStyles";
import { BEAT_STYLES } from "./beatStyles";

// ---------------------------------------------------------------------------
// PR-21 open-licensed reference examples (DATA)
//
// This manifest is SEPARATE from src/lib/styleReferences.ts. STYLE_REFERENCES
// lists *commercial* recordings as metadata-only learning targets (we link to
// them but cannot redistribute them). This manifest lists *redistributable
// open-license* examples the workshop may legally bundle, remix, or use as
// fixtures.
//
// The guaranteed bundleable example for every style is one we genuinely own:
// the repo's own original beat pattern (src/lib/beatStyles.ts) played with the
// in-repo CC0 drum kit (src/audio/sampleKit.ts + public/kit/LICENSE.md). It is
// CC0, ours to redistribute, and needs no external attribution.
//
// We do NOT fabricate external tracks. Any externally-sourced row would be
// marked bundleable: false + verified: false until a human confirms the real
// license and attribution. See docs/OPEN_REFERENCES.md for the vetting flow and
// the candidate source pools.
// ---------------------------------------------------------------------------

/** Licenses we ALLOW for bundling redistributable assets. */
export type AllowedOpenLicense = "CC0" | "CC-BY" | "CC-BY-SA";

/**
 * Licenses we explicitly DISALLOW for bundling. Entries carrying these may only
 * be recorded as link-only/research pointers (bundleable: false).
 */
export type DisallowedOpenLicense =
  | "CC-BY-NC"
  | "CC-BY-ND"
  | "CC-BY-NC-SA"
  | "CC-BY-NC-ND"
  | "ARR"
  | "unclear";

export type OpenLicense = AllowedOpenLicense | DisallowedOpenLicense;

/** The set of licenses an app-bundled asset is permitted to carry. */
export const ALLOWED_BUNDLE_LICENSES: readonly AllowedOpenLicense[] = [
  "CC0",
  "CC-BY",
  "CC-BY-SA",
];

export interface OpenReferenceExample {
  /** Human-friendly title of the example. */
  title: string;
  /** Creator/author credited for the work. */
  creator: string;
  /** Where the asset (or its license terms) lives. */
  sourceUrl: string;
  /** License governing reuse. */
  license: OpenLicense;
  /** Ready-to-paste attribution string (required, never empty). */
  attributionText: string;
  /** Why this fits the style (free text). */
  styleFit: string;
  /** Whether the asset can be shipped inside the app. */
  bundleable: boolean;
  /** Whether a human has confirmed the license + attribution. */
  verified: boolean;
  /** Tempo if known, else null. */
  bpm?: number | null;
  /** Optional curator notes. */
  notes?: string;
}

const REPO_URL = "https://github.com/William-Hill/render-u-beat-lab";
// Combined CC0 dedication covering BOTH halves of every bundleable in-repo
// example: the original beat patterns (src/lib/beatStyles.ts) and the drum kit
// (public/kit/). public/kit/LICENSE.md only covers the samples, so the example
// points here instead. See docs/OPEN_REFERENCES.md → "CC0 dedication".
const OPEN_REFERENCE_LICENSE_URL = `${REPO_URL}/blob/main/docs/OPEN_REFERENCES.md`;

/**
 * Build the guaranteed CC0 in-repo example for a style: its own original beat
 * pattern (BEAT_STYLES[styleId]) rendered with the bundled CC0 kit. This is a
 * real asset we own, so it is CC0, bundleable, and verified.
 */
function originalCc0Example(styleId: BeatStyleId): OpenReferenceExample {
  const style = BEAT_STYLES[styleId];
  return {
    title: `${style.name} (in-repo original)`,
    creator: "Render U Beat Lab (original)",
    sourceUrl: OPEN_REFERENCE_LICENSE_URL,
    license: "CC0",
    attributionText:
      "Render U Beat Lab original pattern + in-repo drum kit, both dedicated to the public domain under CC0 1.0 (no attribution required).",
    styleFit: `Original ${style.name} pattern at ${style.bpm} BPM, built into the app and rendered with the CC0 kit.`,
    bundleable: true,
    verified: true,
    bpm: style.bpm,
    notes:
      "Guaranteed redistributable example: our own pattern + the CC0 one-shots from PR-13, both covered by the CC0 dedication in docs/OPEN_REFERENCES.md. Always available even where external open assets are weak.",
  };
}

/**
 * OPEN_REFERENCES: every supported style maps to >= 1 reviewed open-license
 * example. The first entry per style is the guaranteed in-repo CC0 original.
 *
 * External (non-repo) candidates are intentionally NOT included: none have been
 * human-verified for real license + attribution. Adding an unverified, possibly
 * fabricated external row would be a real-world licensing harm. The vetting flow
 * for a human to add CC0/CC-BY picks lives in docs/OPEN_REFERENCES.md.
 */
export const OPEN_REFERENCES: Record<BeatStyleId, OpenReferenceExample[]> = {
  trap: [originalCc0Example("trap")],
  crunk: [originalCc0Example("crunk")],
  drill: [originalCc0Example("drill")],
  rnb: [originalCc0Example("rnb")],
  pop: [originalCc0Example("pop")],
  afrobeats: [originalCc0Example("afrobeats")],
  amapiano: [originalCc0Example("amapiano")],
};
