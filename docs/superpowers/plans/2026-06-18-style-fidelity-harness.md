# Style-Fidelity Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic "style-fidelity" similarity tool — render each genre's beat offline, extract a rhythm-dominant feature vector, score similarity against committed per-genre golden signatures, test it in CI, and surface a live fidelity meter in the UI.

**Architecture:** Pure offline PCM render of the in-repo CC0 kit (no WebAudio) → feature vector (rhythm features from the pattern + pure spectral-balance features from the PCM) → cosine similarity on z-scored vectors. Golden vectors are generated from the canonical `BEAT_STYLES` patterns and committed. The UI meter scores the user's current (editable) pattern against its genre golden.

**Tech Stack:** TypeScript, Vitest, React, `tsx` scripts. No new runtime dependencies (Meyda intentionally NOT used — see Global Constraints).

## Global Constraints

- Module hygiene: source files `< 300` lines, test files `< 350` (enforced by `npm run build`).
- Determinism: no `Math.random` / `Date.now` anywhere in render/extract/generation. Fixed sample rate `22050`.
- No new runtime dependency. Spectral features are pure (RMS, low-band energy share, zero-crossing rate) — the spec's documented fallback, chosen up front to avoid Meyda's headless/power-of-2 FFT constraints.
- Reuse existing types verbatim: `Pattern = Record<InstrumentId, boolean[]>`, `InstrumentId = "kick"|"snare"|"hat"|"openHat"`, `BeatStyle { id, name, bpm, swing, pattern, lesson }`, `BeatStyleId`, `decodeWav(input): { samples: Float32Array; sampleRate: number; durationMs: number }`, `countActiveSteps(pattern)`.
- Kit lives at `public/kit/{kick,snare,hat,openHat}.wav` (CC0).
- Tests live under `src/**/*.test.ts` (Vitest include glob).

---

### Task 1: Feature vector type + rhythm features

**Files:**
- Create: `src/lib/styleFidelity.ts`
- Test: `src/lib/styleFidelity.test.ts`

**Interfaces:**
- Consumes: `Pattern`, `InstrumentId`, `countActiveSteps` from `./patterns`; `BeatStyle` from `./beatStyles`.
- Produces:
  - `interface StyleFeatureVector` with numeric fields: `bpmNorm, swing, onsetDensity, laneShareKick, laneShareSnare, laneShareHat, laneShareOpenHat, syncopation, backbeat, rmsNorm, lowEnergyShare, zcr`.
  - `const FEATURE_KEYS: (keyof StyleFeatureVector)[]`
  - `function extractRhythmFeatures(pattern: Pattern, style: BeatStyle): Pick<StyleFeatureVector, "bpmNorm"|"swing"|"onsetDensity"|"laneShareKick"|"laneShareSnare"|"laneShareHat"|"laneShareOpenHat"|"syncopation"|"backbeat">`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/styleFidelity.test.ts
import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { extractRhythmFeatures } from "./styleFidelity";

describe("extractRhythmFeatures", () => {
  it("derives normalized rhythm features from a style's pattern", () => {
    const f = extractRhythmFeatures(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap);
    expect(f.bpmNorm).toBeCloseTo(142 / 200, 5);
    expect(f.swing).toBeCloseTo(0.04, 5);
    // lane shares sum to 1 when there is at least one hit
    const shareSum =
      f.laneShareKick + f.laneShareSnare + f.laneShareHat + f.laneShareOpenHat;
    expect(shareSum).toBeCloseTo(1, 5);
    // every feature is finite and in a sane range
    expect(f.onsetDensity).toBeGreaterThan(0);
    expect(f.onsetDensity).toBeLessThanOrEqual(1);
    expect(f.syncopation).toBeGreaterThanOrEqual(0);
    expect(f.syncopation).toBeLessThanOrEqual(1);
    expect(f.backbeat).toBeGreaterThanOrEqual(0);
    expect(f.backbeat).toBeLessThanOrEqual(1);
  });

  it("returns zero shares for an empty pattern without NaN", () => {
    const empty = { kick: [], snare: [], hat: [], openHat: [] } as unknown as typeof BEAT_STYLES.trap.pattern;
    const f = extractRhythmFeatures(
      { kick: new Array(16).fill(false), snare: new Array(16).fill(false), hat: new Array(16).fill(false), openHat: new Array(16).fill(false) },
      { ...BEAT_STYLES.trap, pattern: empty },
    );
    expect(f.onsetDensity).toBe(0);
    expect(f.laneShareKick).toBe(0);
    expect(Number.isNaN(f.syncopation)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: FAIL — `extractRhythmFeatures` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/styleFidelity.ts
import type { BeatStyle } from "./beatStyles";
import { countActiveSteps, type InstrumentId, type Pattern } from "./patterns";

export interface StyleFeatureVector {
  bpmNorm: number;
  swing: number;
  onsetDensity: number;
  laneShareKick: number;
  laneShareSnare: number;
  laneShareHat: number;
  laneShareOpenHat: number;
  syncopation: number;
  backbeat: number;
  rmsNorm: number;
  lowEnergyShare: number;
  zcr: number;
}

export const FEATURE_KEYS: (keyof StyleFeatureVector)[] = [
  "bpmNorm", "swing", "onsetDensity",
  "laneShareKick", "laneShareSnare", "laneShareHat", "laneShareOpenHat",
  "syncopation", "backbeat", "rmsNorm", "lowEnergyShare", "zcr",
];

const STEPS = 16;
const LANES: InstrumentId[] = ["kick", "snare", "hat", "openHat"];
// Strong 16th positions = the four quarter-note downbeats (0-based indices).
const STRONG_POSITIONS = new Set([0, 4, 8, 12]);
// Backbeat slots = beats 2 and 4 (0-based indices).
const BACKBEAT_POSITIONS = [4, 12];

function laneHits(row: boolean[]): number {
  return row.filter(Boolean).length;
}

export function extractRhythmFeatures(pattern: Pattern, style: BeatStyle) {
  const total = countActiveSteps(pattern);
  const share = (row: boolean[]) => (total === 0 ? 0 : laneHits(row) / total);

  let weakHits = 0;
  for (const lane of LANES) {
    pattern[lane].forEach((on, i) => {
      if (on && !STRONG_POSITIONS.has(i)) weakHits += 1;
    });
  }
  const syncopation = total === 0 ? 0 : weakHits / total;

  const snareBackbeat =
    BACKBEAT_POSITIONS.filter((i) => pattern.snare[i]).length / BACKBEAT_POSITIONS.length;

  return {
    bpmNorm: style.bpm / 200,
    swing: style.swing,
    onsetDensity: total / (LANES.length * STEPS),
    laneShareKick: share(pattern.kick),
    laneShareSnare: share(pattern.snare),
    laneShareHat: share(pattern.hat),
    laneShareOpenHat: share(pattern.openHat),
    syncopation,
    backbeat: snareBackbeat,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/styleFidelity.ts src/lib/styleFidelity.test.ts
git commit -m "feat(style-fidelity): rhythm feature extraction"
```

---

### Task 2: Offline PCM render + Node kit loader

**Files:**
- Create: `src/lib/styleRender.ts`
- Create: `src/lib/loadKit.node.ts`
- Test: `src/lib/styleRender.test.ts`

**Interfaces:**
- Consumes: `Pattern`, `InstrumentId` from `./patterns`; `BeatStyle` from `./beatStyles`; `decodeWav` from `./wav`.
- Produces:
  - `const RENDER_SAMPLE_RATE = 22050`
  - `type DecodedKit = Record<InstrumentId, Float32Array>`
  - `function renderPatternToPcm(pattern: Pattern, style: BeatStyle, kit: DecodedKit): Float32Array`
  - (loadKit.node) `function loadKitFromDisk(kitDir?: string): DecodedKit`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/styleRender.test.ts
import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { RENDER_SAMPLE_RATE, renderPatternToPcm } from "./styleRender";

describe("renderPatternToPcm", () => {
  const kit = loadKitFromDisk();

  it("produces a deterministic, non-silent, bounded buffer", () => {
    const a = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const b = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(RENDER_SAMPLE_RATE); // > ~1s
    // byte-identical across runs
    expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
    // non-silent and peak-bounded
    const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it("renders longer buffers for slower tempos", () => {
    const fast = renderPatternToPcm(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap, kit);
    const slow = renderPatternToPcm(BEAT_STYLES.crunk.pattern, BEAT_STYLES.crunk, kit);
    expect(slow.length).toBeGreaterThan(fast.length); // crunk 96bpm > trap 142bpm bar length
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styleRender.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/styleRender.ts
import type { BeatStyle } from "./beatStyles";
import type { InstrumentId, Pattern } from "./patterns";

export const RENDER_SAMPLE_RATE = 22050;
const STEPS = 16;
const TAIL_SECONDS = 0.5;
const PEAK_TARGET = 0.9;
const LANES: InstrumentId[] = ["kick", "snare", "hat", "openHat"];

export type DecodedKit = Record<InstrumentId, Float32Array>;

export function renderPatternToPcm(
  pattern: Pattern,
  style: BeatStyle,
  kit: DecodedKit,
): Float32Array {
  const stepSec = 60 / style.bpm / 4; // 16th-note duration
  const barSec = STEPS * stepSec;
  const length = Math.ceil((barSec + TAIL_SECONDS) * RENDER_SAMPLE_RATE);
  const out = new Float32Array(length);

  for (const lane of LANES) {
    const sample = kit[lane];
    pattern[lane].forEach((on, i) => {
      if (!on) return;
      // Swing: delay odd 16ths by a fraction of a step.
      const swungSec = i * stepSec + (i % 2 === 1 ? style.swing * stepSec : 0);
      const start = Math.round(swungSec * RENDER_SAMPLE_RATE);
      for (let s = 0; s < sample.length && start + s < length; s += 1) {
        out[start + s] += sample[s];
      }
    });
  }

  // Peak-normalize deterministically so the spectral features have a stable scale.
  let peak = 0;
  for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const gain = PEAK_TARGET / peak;
    for (let i = 0; i < out.length; i += 1) out[i] *= gain;
  }
  return out;
}
```

```ts
// src/lib/loadKit.node.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { InstrumentId } from "./patterns";
import { decodeWav } from "./wav";
import type { DecodedKit } from "./styleRender";
import { RENDER_SAMPLE_RATE } from "./styleRender";

const LANES: InstrumentId[] = ["kick", "snare", "hat", "openHat"];

/** Load + decode the bundled CC0 kit from disk (Node: scripts + tests). */
export function loadKitFromDisk(
  kitDir = join(process.cwd(), "public", "kit"),
): DecodedKit {
  const kit = {} as DecodedKit;
  for (const lane of LANES) {
    const decoded = decodeWav(readFileSync(join(kitDir, `${lane}.wav`)));
    if (decoded.sampleRate !== RENDER_SAMPLE_RATE) {
      throw new Error(
        `Kit sample ${lane}.wav is ${decoded.sampleRate}Hz, expected ${RENDER_SAMPLE_RATE}Hz`,
      );
    }
    kit[lane] = decoded.samples;
  }
  return kit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styleRender.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/styleRender.ts src/lib/loadKit.node.ts src/lib/styleRender.test.ts
git commit -m "feat(style-fidelity): deterministic offline PCM render + node kit loader"
```

---

### Task 3: Spectral features + full feature extraction

**Files:**
- Modify: `src/lib/styleFidelity.ts`
- Modify: `src/lib/styleFidelity.test.ts`

**Interfaces:**
- Consumes: `renderPatternToPcm`, `RENDER_SAMPLE_RATE`, `DecodedKit` from `./styleRender`.
- Produces: `function extractStyleFeatures(pattern: Pattern, style: BeatStyle, pcm: Float32Array): StyleFeatureVector`

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/styleFidelity.test.ts
import { loadKitFromDisk } from "./loadKit.node";
import { renderPatternToPcm } from "./styleRender";
import { extractStyleFeatures } from "./styleFidelity";

describe("extractStyleFeatures", () => {
  const kit = loadKitFromDisk();

  it("returns all feature keys, finite and bounded", () => {
    const style = BEAT_STYLES.trap;
    const pcm = renderPatternToPcm(style.pattern, style, kit);
    const f = extractStyleFeatures(style.pattern, style, pcm);
    for (const key of ["rmsNorm", "lowEnergyShare", "zcr"] as const) {
      expect(Number.isFinite(f[key])).toBe(true);
      expect(f[key]).toBeGreaterThanOrEqual(0);
      expect(f[key]).toBeLessThanOrEqual(1.0001);
    }
    expect(f.bpmNorm).toBeCloseTo(142 / 200, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: FAIL — `extractStyleFeatures` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to src/lib/styleFidelity.ts
import { RENDER_SAMPLE_RATE } from "./styleRender";

// One-pole lowpass coefficient for a ~200Hz cutoff at the render sample rate.
const LOWPASS_CUTOFF_HZ = 200;

function spectralFeatures(pcm: Float32Array) {
  const dt = 1 / RENDER_SAMPLE_RATE;
  const rc = 1 / (2 * Math.PI * LOWPASS_CUTOFF_HZ);
  const alpha = dt / (rc + dt);

  let sumSq = 0;
  let lowSumSq = 0;
  let zeroCrossings = 0;
  let lp = 0;
  let prev = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const x = pcm[i];
    sumSq += x * x;
    lp += alpha * (x - lp);
    lowSumSq += lp * lp;
    if (i > 0 && Math.sign(x) !== Math.sign(prev) && x !== 0) zeroCrossings += 1;
    prev = x;
  }
  const n = pcm.length || 1;
  const rms = Math.sqrt(sumSq / n);
  return {
    rmsNorm: Math.min(1, rms),
    lowEnergyShare: sumSq === 0 ? 0 : lowSumSq / sumSq,
    zcr: zeroCrossings / n,
  };
}

export function extractStyleFeatures(
  pattern: Pattern,
  style: BeatStyle,
  pcm: Float32Array,
): StyleFeatureVector {
  return { ...extractRhythmFeatures(pattern, style), ...spectralFeatures(pcm) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/styleFidelity.ts src/lib/styleFidelity.test.ts
git commit -m "feat(style-fidelity): pure spectral-balance features + full extractor"
```

---

### Task 4: Similarity + z-score normalization

**Files:**
- Modify: `src/lib/styleFidelity.ts`
- Modify: `src/lib/styleFidelity.test.ts`

**Interfaces:**
- Produces:
  - `interface NormalizationStats { mean: StyleFeatureVector; std: StyleFeatureVector }`
  - `function computeNormalizationStats(vectors: StyleFeatureVector[]): NormalizationStats`
  - `function styleSimilarity(a: StyleFeatureVector, b: StyleFeatureVector, stats: NormalizationStats): number` — cosine on z-scored vectors mapped to `[0,1]` as `(1+cos)/2`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/styleFidelity.test.ts
import { computeNormalizationStats, styleSimilarity, FEATURE_KEYS } from "./styleFidelity";

describe("styleSimilarity", () => {
  const kit = loadKitFromDisk();
  const vectors = Object.values(BEAT_STYLES).map((s) =>
    extractStyleFeatures(s.pattern, s, renderPatternToPcm(s.pattern, s, kit)),
  );
  const stats = computeNormalizationStats(vectors);

  it("is 1 for identical vectors", () => {
    expect(styleSimilarity(vectors[0], vectors[0], stats)).toBeCloseTo(1, 6);
  });
  it("is symmetric and bounded to [0,1]", () => {
    const ab = styleSimilarity(vectors[0], vectors[1], stats);
    const ba = styleSimilarity(vectors[1], vectors[0], stats);
    expect(ab).toBeCloseTo(ba, 6);
    expect(ab).toBeGreaterThanOrEqual(0);
    expect(ab).toBeLessThanOrEqual(1);
  });
  it("computes std as zero-safe (no NaN) for constant features", () => {
    expect(FEATURE_KEYS.every((k) => Number.isFinite(stats.std[k]))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to src/lib/styleFidelity.ts
export interface NormalizationStats {
  mean: StyleFeatureVector;
  std: StyleFeatureVector;
}

function emptyVector(): StyleFeatureVector {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0])) as StyleFeatureVector;
}

export function computeNormalizationStats(
  vectors: StyleFeatureVector[],
): NormalizationStats {
  const mean = emptyVector();
  const std = emptyVector();
  const n = vectors.length || 1;
  for (const key of FEATURE_KEYS) {
    const m = vectors.reduce((sum, v) => sum + v[key], 0) / n;
    const variance = vectors.reduce((sum, v) => sum + (v[key] - m) ** 2, 0) / n;
    mean[key] = m;
    std[key] = Math.sqrt(variance) || 1; // zero-safe: constant feature -> std 1
  }
  return { mean, std };
}

function zScore(v: StyleFeatureVector, stats: NormalizationStats): number[] {
  return FEATURE_KEYS.map((k) => (v[k] - stats.mean[k]) / stats.std[k]);
}

export function styleSimilarity(
  a: StyleFeatureVector,
  b: StyleFeatureVector,
  stats: NormalizationStats,
): number {
  const za = zScore(a, stats);
  const zb = zScore(b, stats);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < za.length; i += 1) {
    dot += za[i] * zb[i];
    na += za[i] * za[i];
    nb += zb[i] * zb[i];
  }
  if (na === 0 || nb === 0) return na === nb ? 1 : 0; // both-zero vectors are identical
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.min(1, Math.max(0, (1 + cos) / 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styleFidelity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/styleFidelity.ts src/lib/styleFidelity.test.ts
git commit -m "feat(style-fidelity): z-scored cosine similarity"
```

---

### Task 5: Golden generation script + committed data

**Files:**
- Create: `scripts/generate-style-profiles.ts`
- Create: `src/lib/styleProfiles.generated.ts` (written BY the script — commit its output)
- Modify: `package.json` (add `generate:style-profiles` script)

**Interfaces:**
- Consumes: `BEAT_STYLES`, `loadKitFromDisk`, `renderPatternToPcm`, `extractStyleFeatures`, `computeNormalizationStats`.
- Produces (in the generated module):
  - `const STYLE_PROFILE_STATS: NormalizationStats`
  - `const STYLE_GOLDENS: Record<BeatStyleId, StyleFeatureVector>`

- [ ] **Step 1: Write the generator script**

```ts
// scripts/generate-style-profiles.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BEAT_STYLES, type BeatStyleId } from "../src/lib/beatStyles";
import { loadKitFromDisk } from "../src/lib/loadKit.node";
import { renderPatternToPcm } from "../src/lib/styleRender";
import {
  computeNormalizationStats,
  extractStyleFeatures,
  type StyleFeatureVector,
} from "../src/lib/styleFidelity";

function main(): void {
  const kit = loadKitFromDisk();
  const ids = Object.keys(BEAT_STYLES) as BeatStyleId[];
  const goldens = {} as Record<BeatStyleId, StyleFeatureVector>;
  for (const id of ids) {
    const style = BEAT_STYLES[id];
    goldens[id] = extractStyleFeatures(
      style.pattern, style, renderPatternToPcm(style.pattern, style, kit),
    );
  }
  const stats = computeNormalizationStats(ids.map((id) => goldens[id]));

  const banner =
    "// GENERATED by scripts/generate-style-profiles.ts — do not edit by hand.\n" +
    "// Regenerate: npm run generate:style-profiles\n";
  const body =
    `import type { BeatStyleId } from "./beatStyles";\n` +
    `import type { NormalizationStats, StyleFeatureVector } from "./styleFidelity";\n\n` +
    `export const STYLE_PROFILE_STATS: NormalizationStats = ${JSON.stringify(stats, null, 2)};\n\n` +
    `export const STYLE_GOLDENS: Record<BeatStyleId, StyleFeatureVector> = ${JSON.stringify(goldens, null, 2)};\n`;

  writeFileSync(join(process.cwd(), "src/lib/styleProfiles.generated.ts"), banner + body);
  console.log(`Wrote style profiles for ${ids.length} genres.`);
}

main();
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add:
```json
"generate:style-profiles": "tsx scripts/generate-style-profiles.ts",
```

- [ ] **Step 3: Run the generator**

Run: `npm run generate:style-profiles`
Expected: `Wrote style profiles for 7 genres.` and a new `src/lib/styleProfiles.generated.ts`.

- [ ] **Step 4: Verify the generated module typechecks**

Run: `npm run typecheck:scripts && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit (script + generated data)**

```bash
git add scripts/generate-style-profiles.ts src/lib/styleProfiles.generated.ts package.json
git commit -m "feat(style-fidelity): golden profile generator + committed goldens"
```

---

### Task 6: scoreStyleFidelity + harness tests

**Files:**
- Modify: `src/lib/styleFidelity.ts`
- Create: `src/lib/styleFidelityHarness.test.ts`

**Interfaces:**
- Consumes: `STYLE_GOLDENS`, `STYLE_PROFILE_STATS` from `./styleProfiles.generated`; `DecodedKit`, `renderPatternToPcm` from `./styleRender`; `BeatStyleId` from `./beatStyles`.
- Produces: `function scoreStyleFidelity(pattern: Pattern, styleId: BeatStyleId, kit: DecodedKit): { score: number; nearestGenre: BeatStyleId }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/styleFidelityHarness.test.ts
import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { renderPatternToPcm } from "./styleRender";
import { extractStyleFeatures, scoreStyleFidelity, styleSimilarity } from "./styleFidelity";
import { STYLE_GOLDENS, STYLE_PROFILE_STATS } from "./styleProfiles.generated";

const kit = loadKitFromDisk();
const ids = Object.keys(BEAT_STYLES) as BeatStyleId[];

describe("style-fidelity harness", () => {
  it("drift guard: each canonical render matches its committed golden", () => {
    for (const id of ids) {
      const { score, nearestGenre } = scoreStyleFidelity(BEAT_STYLES[id].pattern, id, kit);
      expect(score, `drift on ${id} — run: npm run generate:style-profiles`).toBeGreaterThanOrEqual(0.98);
      expect(nearestGenre).toBe(id);
    }
  });

  it("genre distinction: each genre is most similar to its own golden", () => {
    for (const id of ids) {
      const f = extractStyleFeatures(
        BEAT_STYLES[id].pattern, BEAT_STYLES[id], renderPatternToPcm(BEAT_STYLES[id].pattern, BEAT_STYLES[id], kit),
      );
      const ranked = ids
        .map((h) => ({ h, sim: styleSimilarity(f, STYLE_GOLDENS[h], STYLE_PROFILE_STATS) }))
        .sort((a, b) => b.sim - a.sim);
      expect(ranked[0].h).toBe(id);
    }
  });

  it("edit-sanity: flooding trap with 16th hats lowers its trap score", () => {
    const base = scoreStyleFidelity(BEAT_STYLES.trap.pattern, "trap", kit).score;
    const busy = {
      ...BEAT_STYLES.trap.pattern,
      hat: new Array(16).fill(true),
    };
    const edited = scoreStyleFidelity(busy, "trap", kit).score;
    expect(edited).toBeLessThan(base);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styleFidelityHarness.test.ts`
Expected: FAIL — `scoreStyleFidelity` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to src/lib/styleFidelity.ts
import type { BeatStyleId } from "./beatStyles";
import { BEAT_STYLES } from "./beatStyles";
import type { DecodedKit } from "./styleRender";
import { renderPatternToPcm } from "./styleRender";
import { STYLE_GOLDENS, STYLE_PROFILE_STATS } from "./styleProfiles.generated";

export function scoreStyleFidelity(
  pattern: Pattern,
  styleId: BeatStyleId,
  kit: DecodedKit,
): { score: number; nearestGenre: BeatStyleId } {
  const style = BEAT_STYLES[styleId];
  const features = extractStyleFeatures(pattern, style, renderPatternToPcm(pattern, style, kit));
  const ids = Object.keys(STYLE_GOLDENS) as BeatStyleId[];
  let nearestGenre = styleId;
  let best = -Infinity;
  for (const id of ids) {
    const sim = styleSimilarity(features, STYLE_GOLDENS[id], STYLE_PROFILE_STATS);
    if (sim > best) {
      best = sim;
      nearestGenre = id;
    }
  }
  return {
    score: styleSimilarity(features, STYLE_GOLDENS[styleId], STYLE_PROFILE_STATS),
    nearestGenre,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styleFidelityHarness.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify hygiene + full suite + build**

Run: `npm run hygiene && npm test && npm run build`
Expected: hygiene OK (confirm `styleFidelity.ts < 300` lines — if over, extract `styleRender`-adjacent helpers; it should be ~180), all tests pass, build clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/styleFidelity.ts src/lib/styleFidelityHarness.test.ts
git commit -m "feat(style-fidelity): scoreStyleFidelity + harness tests (drift, distinction, edit-sanity)"
```

---

### Task 7: UI style-fidelity meter

**Files:**
- Create: `src/components/StyleFidelityMeter.tsx`
- Create: `src/components/StyleFidelityMeter.test.tsx`
- Create: `src/lib/loadKit.browser.ts`
- Modify: `vite.config.ts` (broaden the Vitest `include` glob to also match `.test.tsx`)
- Modify: `src/App.tsx` (render the meter near the sequencer; pass current pattern + styleId)

**IMPORTANT — do this first:** the current Vitest `include` is `["src/**/*.test.ts"]`, which does NOT match `.test.tsx`. Without the config change the component test silently never runs.

**Interfaces:**
- Consumes: `scoreStyleFidelity`, `DecodedKit`, `BeatStyleId`, current `Pattern` + `styleId` from App state.
- Produces: `function StyleFidelityMeter(props: { pattern: Pattern; styleId: BeatStyleId; kit: DecodedKit | null }): JSX.Element`; `async function loadKitFromUrls(base?: string): Promise<DecodedKit>`

- [ ] **Step 1: Write the failing component test**

```tsx
// src/components/StyleFidelityMeter.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { loadKitFromDisk } from "../lib/loadKit.node";
import { StyleFidelityMeter } from "./StyleFidelityMeter";

describe("StyleFidelityMeter", () => {
  it("renders a percentage for the canonical pattern", () => {
    const kit = loadKitFromDisk();
    const html = renderToStaticMarkup(
      <StyleFidelityMeter pattern={BEAT_STYLES.trap.pattern} styleId="trap" kit={kit} />,
    );
    expect(html).toMatch(/%/);
    expect(html.toLowerCase()).toContain("trap");
  });

  it("shows a loading state when the kit is null", () => {
    const html = renderToStaticMarkup(
      <StyleFidelityMeter pattern={BEAT_STYLES.trap.pattern} styleId="trap" kit={null} />,
    );
    expect(html.toLowerCase()).toMatch(/loading|…|\.\.\./);
  });
});
```

(Confirm `react-dom` is available — it's a React app, so it is. The Vitest env for `.tsx` may need `environment: "jsdom"`; this test uses `renderToStaticMarkup` from `react-dom/server`, which works under the default `node` env, so no config change is required.)

- [ ] **Step 2: Broaden the Vitest include glob, then run the test to verify it fails**

In `vite.config.ts`, change the test include to match `.tsx`:
```ts
    include: ["src/**/*.test.{ts,tsx}"],
```
Run: `npx vitest run src/components/StyleFidelityMeter.test.tsx`
Expected: FAIL — component not found (NOT "no test files found"; if you see the latter the glob change didn't take).

- [ ] **Step 3: Write the component + browser loader**

```tsx
// src/components/StyleFidelityMeter.tsx
import { useMemo } from "react";
import type { BeatStyleId } from "../lib/beatStyles";
import type { Pattern } from "../lib/patterns";
import type { DecodedKit } from "../lib/styleRender";
import { scoreStyleFidelity } from "../lib/styleFidelity";

interface StyleFidelityMeterProps {
  pattern: Pattern;
  styleId: BeatStyleId;
  kit: DecodedKit | null;
}

export function StyleFidelityMeter({ pattern, styleId, kit }: StyleFidelityMeterProps) {
  const result = useMemo(
    () => (kit ? scoreStyleFidelity(pattern, styleId, kit) : null),
    [pattern, styleId, kit],
  );

  if (!result) {
    return <div className="style-fidelity" aria-busy="true">Analyzing… </div>;
  }

  const pct = Math.round(result.score * 100);
  const drifted = result.nearestGenre !== styleId;
  return (
    <div className="style-fidelity">
      <span className="style-fidelity__label">
        {pct}% {styleId}-like
      </span>
      {drifted && (
        <span className="style-fidelity__hint">
          (closer to {result.nearestGenre})
        </span>
      )}
    </div>
  );
}
```

```ts
// src/lib/loadKit.browser.ts
import type { InstrumentId } from "./patterns";
import { decodeWav } from "./wav";
import type { DecodedKit } from "./styleRender";

const LANES: InstrumentId[] = ["kick", "snare", "hat", "openHat"];

/** Fetch + decode the bundled CC0 kit in the browser. */
export async function loadKitFromUrls(base = "/kit"): Promise<DecodedKit> {
  const kit = {} as DecodedKit;
  await Promise.all(
    LANES.map(async (lane) => {
      const res = await fetch(`${base}/${lane}.wav`);
      kit[lane] = decodeWav(await res.arrayBuffer()).samples;
    }),
  );
  return kit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/StyleFidelityMeter.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into App.tsx**

In `src/App.tsx`: add a `kit` state loaded once via `loadKitFromUrls()` in an effect (`const [kit, setKit] = useState<DecodedKit | null>(null)`; `useEffect(() => { loadKitFromUrls().then(setKit).catch(() => setKit(null)); }, [])`), then render `<StyleFidelityMeter pattern={sequencer.pattern} styleId={sequencer.styleId} kit={kit} />` next to the sequencer panel. Use the existing pattern/styleId state names (confirm in `App.tsx` — the sequencer panel already holds the editable pattern and selected style).

- [ ] **Step 6: Verify everything**

Run: `npm run hygiene && npm test && npm run build`
Expected: hygiene OK, all tests pass, build clean (kit still ships to `dist/kit`).

- [ ] **Step 7: Commit**

```bash
git add src/components/StyleFidelityMeter.tsx src/components/StyleFidelityMeter.test.tsx src/lib/loadKit.browser.ts vite.config.ts src/App.tsx
git commit -m "feat(style-fidelity): live style-fidelity meter in the beat lab"
```

---

## Notes for the implementer

- **Test layering (why these tests are meaningful):** the goldens are generated by the same render+extract code, so the *drift guard* catches accidental code/output changes (regression), the *genre-distinction* test catches goldens colliding (distinctness), and the *edit-sanity* test catches loss of discriminative power (correctness). Together they cover the spec's two oracle invariants plus real behavior.
- **If `scoreStyleFidelity` import of `styleProfiles.generated` creates an ordering issue:** Task 5 must run (generate the file) before Task 6 compiles. Implement tasks in order.
- **Hygiene:** if `styleFidelity.ts` exceeds 300 lines after Task 6, move `spectralFeatures` + `extractRhythmFeatures` into a `styleFeatures.ts` and re-export. Expected size is comfortably under.
- **Docs (fold into Task 6 or a follow-up commit):** add a short `docs/STYLE_FIDELITY.md` explaining the rhythm-dominant approach, the honest "not the hit record" framing, and the `npm run generate:style-profiles` workflow; link from README. (Optional but recommended; not gated.)
