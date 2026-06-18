# Style-Fidelity Harness — Design

**Date:** 2026-06-18
**Status:** Approved design, pending spec review
**Related:** PR-13 (CC0 kit), PR-15 (reference profiles), PR-18 (audio contract tests), PR-21 (#28 open references)

## Problem

We want to (1) measure how "sonically similar" a generated beat is to a target,
and (2) test that each genre's beat lands in the right sonic territory and that
the genres are mutually distinct. Two hard constraints shape the solution:

- **No reference audio exists.** `STYLE_REFERENCES` is commercial metadata only
  (BPM, swing, feel text) — there is no Future/Migos audio to diff against, and
  the only redistributable audio we own is the in-repo CC0 kit + our own
  patterns.
- **All genres share one kit.** Because every style is rendered with the same
  CC0 drum kit, spectral/timbre features are nearly genre-neutral. The signal
  that separates trap from drill from amapiano is **rhythm**: onset density,
  per-lane hit distribution, syncopation, backbeat, swing, and tempo.

So this harness measures **rhythm + tempo + spectral-balance** similarity. It is
explicitly *not* "does this sound like the hit record." We document that framing
so the workshop doesn't oversell it.

## Oracle: golden snapshot + genre distinction

"Similar" is measured against committed **golden feature vectors** — one per
genre, generated from the canonical `BEAT_STYLES[genre]` pattern. Two invariants:

1. **Drift guard** — `styleSimilarity(features(render(g)), GOLDEN[g]) ≥ 0.98`
   for every genre. Catches accidental signature drift; an intentional change
   forces a deliberate golden regeneration.
2. **Genre distinction (nearest-neighbor)** — for every genre `g`,
   `argmax_h styleSimilarity(features(render(g)), GOLDEN[h]) == g`. One
   principled assertion: each genre's beat is most similar to its own signature.
   No bikeshedding individual feature thresholds.

## Architecture

Five focused units, each independently testable and under the 300-line hygiene
limit:

### 1. `src/lib/styleFidelity.ts` — pure core (no WebAudio, no randomness)

```ts
export interface StyleFeatureVector {
  // Rhythm (primary, pure from pattern) — the discriminative signal
  bpmNorm: number;          // bpm / 200
  swing: number;            // style.swing, 0..0.5
  onsetDensity: number;     // total hits / (lanes * steps), 0..1
  laneShareKick: number;    // kick hits / total hits
  laneShareSnare: number;
  laneShareHat: number;
  laneShareOpenHat: number; // four shares sum to 1
  syncopation: number;      // share of hits on weak 16th positions, 0..1
  backbeat: number;         // snare presence on beats 2 & 4, 0..1
  // Spectral (secondary, from rendered PCM) — captures "heavy lows" etc.
  spectralCentroidNorm: number;
  spectralFlatness: number;
  lowEnergyShare: number;   // sub-band energy / total
  rmsNorm: number;
}

// Deterministic offline mix of decoded CC0 kit one-shots at step times.
export function renderPatternToPcm(
  pattern: Pattern, style: BeatStyle, kit: DecodedKit,
): Float32Array;

export function extractStyleFeatures(
  pattern: Pattern, style: BeatStyle, pcm: Float32Array,
): StyleFeatureVector;

// Cosine similarity on z-scored vectors, mapped to [0,1] as (1+cos)/2.
// Identity = 1, symmetric. THIS is the reusable "how similar" calculation.
export function styleSimilarity(
  a: StyleFeatureVector, b: StyleFeatureVector, stats: NormalizationStats,
): number;

// Convenience: score a (possibly edited) pattern against its genre golden.
export function scoreStyleFidelity(
  pattern: Pattern, styleId: BeatStyleId,
): { score: number; nearestGenre: BeatStyleId };
```

- **Render:** fixed sample rate 22050 (matches the kit), one bar of 16th notes
  (`stepSec = 60 / bpm / 4`), swing applied as a fractional offset to odd 16ths,
  plus a short tail so decays aren't clipped. Mix = sample-accurate summation of
  the decoded kit one-shots, then peak-normalized. Byte-identical every run.
- **Normalization:** features are z-scored using per-feature mean/std computed
  across the seven genre goldens (stored *with* the goldens). Cosine on z-scored
  vectors prevents any one large-magnitude feature from dominating.

### 2. `src/lib/styleProfiles.generated.ts` — committed golden data

Generated, imported by **both** the app and the tests:

```ts
export interface NormalizationStats { mean: StyleFeatureVector; std: StyleFeatureVector; }
export const STYLE_PROFILE_STATS: NormalizationStats;
export const STYLE_GOLDENS: Record<BeatStyleId, StyleFeatureVector>;
```

### 3. `scripts/generate-style-profiles.ts` — deterministic regeneration

`npm run generate:style-profiles` — decodes the kit, renders each
`BEAT_STYLES[g]`, extracts features, computes normalization stats, and writes
`styleProfiles.generated.ts`. Same determinism contract as `generate:kit`
(no `Math.random`/`Date.now`).

### 4. `src/components/StyleFidelityMeter.tsx` — UI

The golden is the *canonical* genre beat; the meter shows how close the user's
**current (editable) sequencer pattern** is to it: *"your trap beat is 78%
trap-like."* A live "am I staying true to the genre" gauge for learners.

- Props: current `pattern` + `styleId`.
- Computes `scoreStyleFidelity` via the same offline render+extract pipeline,
  memoized on `(pattern, styleId)` and debounced so rapid edits don't thrash.
- Renders a percentage + a simple bar; when `nearestGenre !== styleId`, hints
  "this now reads more like {nearestGenre}".
- Placed alongside the sequencer panel in `App.tsx`.

### 5. `src/lib/styleFidelity.test.ts` — CI tests

- Drift guard per genre (`≥ 0.98` vs golden).
- Nearest-neighbor genre distinction across all seven.
- `styleSimilarity` properties: identity = 1, symmetric, bounded `[0,1]`.
- Edit-sanity: mutating a trap pattern toward busy 16th hats measurably lowers
  its trap score and can flip `nearestGenre`.
- A golden-staleness test that fails with a clear *"run npm run
  generate:style-profiles"* message if the live render no longer matches the
  committed golden.

## Data flow

- **Build/test:** `BEAT_STYLES[g]` → render → features → cosine vs `STYLE_GOLDENS`.
- **App:** sequencer pattern (possibly edited) → render → features → cosine vs
  `STYLE_GOLDENS[currentGenre]` → percentage meter.

## Determinism / CI

Fixed sample rate + fixed kit bytes + no randomness → byte-identical PCM →
identical features → stable scores. Meyda (if used for spectral features) is
deterministic on a fixed buffer.

## Dependencies & boundaries

- Reuses `decodeWav` (`src/lib/wav.ts`), `Pattern`/`InstrumentId`
  (`src/lib/patterns.ts`), `BEAT_STYLES`/`BeatStyleId` (`src/lib/beatStyles.ts`),
  the CC0 kit under `public/kit/`.
- Does **not** touch the audio engines, `sampleKit.ts`, or `styleReferences.ts`.
- Spectral features via **Meyda** are *secondary*. If Meyda is awkward headless,
  fallbacks (in priority order): a tiny pure FFT extractor for centroid/flatness,
  or drop spectral features entirely — rhythm features carry the discrimination,
  so the harness still works.

## Risks

1. **Meyda headless in Node** — validate first thing in the plan; fallback above.
2. **Feature discriminativeness** — shared kit means rhythm must dominate;
   addressed by the feature design. The nearest-neighbor test will surface any
   weakness immediately.
3. **Normalization stability** — stats are derived from and stored with the
   goldens, so the basis is fixed and committed.
4. **Golden-regen discipline** — the staleness test makes drift loud and
   actionable rather than silent.

## Out of scope (YAGNI)

- Learned audio embeddings (CLAP/OpenL3/VGGish). Noted as a future upgrade if we
  ever bundle real reference audio (e.g. via curated CC0 loops from #28).
- Analyzing the *live* WebAudio/Tone output. The UI meter uses the deterministic
  offline render so it matches the golden basis exactly.
- Per-genre hand-authored feature thresholds (the oracle replaces them).
