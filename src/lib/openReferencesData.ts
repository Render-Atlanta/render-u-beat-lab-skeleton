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
// We do NOT fabricate external tracks. Every externally-sourced row is marked
// bundleable: false + verified: false until a human confirms the real license
// and attribution on the asset's own page. The external candidates below were
// each fetched and had their license read directly from the source page. See
// docs/OPEN_REFERENCES.md for the vetting flow and the candidate source pools.
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

const EXTERNAL_NOTE =
  "External candidate — human to confirm license + download before bundling.";

/**
 * Build a researched, link-only external candidate. Every external entry is
 * ALWAYS bundleable: false + verified: false until a human confirms the real
 * license and attribution on the asset's own page. The fields below were taken
 * from the actual source page (see sourceUrl); nothing is fabricated.
 */
function externalCandidate(
  fields: Pick<
    OpenReferenceExample,
    "title" | "creator" | "sourceUrl" | "license" | "attributionText" | "styleFit"
  > &
    Partial<Pick<OpenReferenceExample, "bpm" | "notes">>,
): OpenReferenceExample {
  return {
    ...fields,
    bpm: fields.bpm ?? null,
    notes: fields.notes ?? EXTERNAL_NOTE,
    bundleable: false,
    verified: false,
  };
}

/** Ready-to-paste CC BY 4.0 credit string for a Free Music Archive track. */
function ccByAttribution(title: string, creator: string, url: string): string {
  return `"${title}" by ${creator}, ${url}, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).`;
}

/**
 * OPEN_REFERENCES: every supported style maps to >= 1 reviewed open-license
 * example. The first entry per style is the guaranteed in-repo CC0 original.
 *
 * The remaining entries are researched EXTERNAL candidates: real, fetched
 * asset pages with their license read directly from the page. They are all
 * bundleable: false + verified: false — link-only pointers for a human to
 * confirm before any bundling (see docs/OPEN_REFERENCES.md). We do NOT invent
 * external rows; a style with no verifiable open pick (crunk) keeps only its
 * in-repo CC0 original.
 */
export const OPEN_REFERENCES: Record<BeatStyleId, OpenReferenceExample[]> = {
  trap: [
    originalCc0Example("trap"),
    externalCandidate({
      title: "Achilles",
      creator: "1000 Handz",
      sourceUrl:
        "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/achilles-1/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Achilles",
        "1000 Handz",
        "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/achilles-1/",
      ),
      styleFit:
        "Melodic rap / trap instrumental (Hip-Hop Beats) from the artist's explicitly CC BY 'free to use' set; the artist asks to credit '1000 Handz'.",
    }),
  ],
  crunk: [originalCc0Example("crunk")],
  drill: [
    originalCc0Example("drill"),
    externalCandidate({
      title: "Fugitive",
      creator: "JMHBM (Beat Mekanik)",
      sourceUrl: "https://freemusicarchive.org/music/beat-mekanik/single/fugitive/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Fugitive",
        "JMHBM",
        "https://freemusicarchive.org/music/beat-mekanik/single/fugitive/",
      ),
      styleFit:
        "Tagged 'NY Drill' / Hip-Hop Beats; a hard drill type beat at a half-time 73 BPM, matching the genre's sliding 808s and dark feel.",
      bpm: 73,
    }),
    externalCandidate({
      title: "Runnin'",
      creator: "JMHBM (Beat Mekanik)",
      sourceUrl: "https://freemusicarchive.org/music/beat-mekanik/single/runnin/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Runnin'",
        "JMHBM",
        "https://freemusicarchive.org/music/beat-mekanik/single/runnin/",
      ),
      styleFit:
        "Described as an intense Hip Hop drill type beat at 145 BPM (the common double-time drill count), an alternate-tempo drill option.",
      bpm: 145,
    }),
  ],
  rnb: [
    originalCc0Example("rnb"),
    externalCandidate({
      title: "Soul Sync",
      creator: "Ketsa",
      sourceUrl:
        "https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/soul-sync/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Soul Sync",
        "Ketsa",
        "https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/soul-sync/",
      ),
      styleFit:
        "Instrumental tagged Soul-RnB / Hip-Hop Beats from Ketsa's CC BY 'free to use for anything' set; smooth neo-soul/R&B feel.",
    }),
  ],
  pop: [
    originalCc0Example("pop"),
    externalCandidate({
      title: "Upbeat Corporate Pop",
      creator: "Music for Creators",
      sourceUrl:
        "https://freemusicarchive.org/music/fretbound/corporate-background-music-1/upbeat-corporate-pop/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Upbeat Corporate Pop",
        "Music for Creators",
        "https://freemusicarchive.org/music/fretbound/corporate-background-music-1/upbeat-corporate-pop/",
      ),
      styleFit: "Tagged Pop / Instrumental; bright, upbeat pop instrumental bed.",
    }),
  ],
  afrobeats: [
    originalCc0Example("afrobeats"),
    externalCandidate({
      title: "Sun Still Sky",
      creator: "Ketsa",
      sourceUrl: "https://freemusicarchive.org/music/Ketsa/upbeat-street/sun-still-sky/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Sun Still Sky",
        "Ketsa",
        "https://freemusicarchive.org/music/Ketsa/upbeat-street/sun-still-sky/",
      ),
      styleFit:
        "Carries an Afrobeat genre tag (with Jazz / Instrumental); warm, percussive Afro-leaning instrumental.",
    }),
  ],
  amapiano: [
    originalCc0Example("amapiano"),
    externalCandidate({
      title: "Amapiano",
      creator: "Elijah_K",
      sourceUrl: "https://freemusicarchive.org/music/elijah-k/single/amapiano/",
      license: "CC-BY",
      attributionText: ccByAttribution(
        "Amapiano",
        "Elijah_K",
        "https://freemusicarchive.org/music/elijah-k/single/amapiano/",
      ),
      styleFit:
        "Self-titled 'Amapiano', tagged Afrobeat / African — a direct genre-name match for the amapiano style.",
    }),
  ],
};
