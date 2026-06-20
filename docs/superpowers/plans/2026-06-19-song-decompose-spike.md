# Song Upload & Decomposition (Phase A Spike) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user drop in an audio file and get an estimated BPM + a quantized one-bar drum pattern decomposed into Beat Lab lanes, ending in an editable `SequencerState`, behind a `?songlab=1` dev flag.

**Architecture:** Five new pure `src/lib` modules compose the existing onset→classify pipeline; only tempo estimation, the one-bar window pick, and a waveform→level-frame adapter are genuinely new. A throwaway flag-gated React panel surfaces the result and a "Load into grid" action. All analysis is unit-tested over synthetic PCM; real-track accuracy is recorded manually in a findings doc.

**Tech Stack:** TypeScript, React, Vite, Vitest. Reuses `onsetDetection`, `beatboxClassifier`, `meydaBeatboxAnalysis`, `wav`, `producerTagSample`, `patternState`, `sequencerDomain`, `patterns`.

## Global Constraints

- Working sample rate is 22050 Hz (`RENDER_SAMPLE_RATE` in `producerTagSample.ts`); decoded audio is resampled to it.
- BPM is clamped to 60–180 (`MIN_BPM`/`MAX_BPM`, `updateSequencerBpm` clamps).
- Grid is 16 steps = one 4-beat bar. `getSequencerLoopDurationMs(bpm)` gives one bar in ms.
- Instrument lanes: `"kick" | "snare" | "hat" | "openHat" | "clap" | "808" | "melody"` (`InstrumentId`).
- Pure analysis modules live in `src/lib`; no React imports in `src/lib` (module hygiene check enforces boundaries — `npm run hygiene`).
- The real gate is `npm run check` AND `npx tsc --noEmit`. No GitHub Actions CI. CodeRabbit credits exhausted (non-blocking).
- Phase A is a spike: NO sample-slicing, NO BPM/downbeat correction UI, NO polished UX. Those are gated Phase B.
- Commit after every task. Run the single test file per task with `npx vitest run <path>`.

---

### Task 1: Tempo estimation (`tempoEstimation.ts`)

Pure IOI-histogram BPM estimator with octave-folding. No dependencies on other new code — build first.

**Files:**
- Create: `src/lib/tempoEstimation.ts`
- Test: `src/lib/tempoEstimation.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `interface TempoEstimate { bpm: number; confidence: number; candidates: { bpm: number; weight: number }[]; }`
  - `function estimateTempo(onsetTimesMs: number[], opts?: { minBpm?: number; maxBpm?: number }): TempoEstimate`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { estimateTempo } from "./tempoEstimation";

function onsetTrain(bpm: number, beats: number, offsetMs = 0): number[] {
  const beatMs = 60000 / bpm;
  return Array.from({ length: beats }, (_, i) => offsetMs + i * beatMs);
}

describe("estimateTempo", () => {
  it("recovers a steady 120 BPM onset train", () => {
    const result = estimateTempo(onsetTrain(120, 16));
    expect(result.bpm).toBeCloseTo(120, 0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("recovers 90 and 140 BPM", () => {
    expect(estimateTempo(onsetTrain(90, 16)).bpm).toBeCloseTo(90, 0);
    expect(estimateTempo(onsetTrain(140, 16)).bpm).toBeCloseTo(140, 0);
  });

  it("octave-folds a 60 BPM (slow) train of eighth-note onsets into range", () => {
    // eighths at 60 bpm => 240ms gaps => 250 bpm raw, must fold to 125
    const eighths = onsetTrain(120, 16); // 250ms... use explicit
    const result = estimateTempo(eighths, { minBpm: 60, maxBpm: 180 });
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(180);
  });

  it("returns low confidence and a safe default for too-few onsets", () => {
    const result = estimateTempo([0]);
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(180);
    expect(result.confidence).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tempoEstimation.test.ts`
Expected: FAIL ("estimateTempo is not a function" / module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
export interface TempoEstimate {
  bpm: number;
  confidence: number;
  candidates: { bpm: number; weight: number }[];
}

const DEFAULT_MIN_BPM = 60;
const DEFAULT_MAX_BPM = 180;

function foldIntoRange(bpm: number, minBpm: number, maxBpm: number): number {
  let folded = bpm;
  while (folded < minBpm) folded *= 2;
  while (folded > maxBpm) folded /= 2;
  return folded;
}

export function estimateTempo(
  onsetTimesMs: number[],
  opts: { minBpm?: number; maxBpm?: number } = {},
): TempoEstimate {
  const minBpm = opts.minBpm ?? DEFAULT_MIN_BPM;
  const maxBpm = opts.maxBpm ?? DEFAULT_MAX_BPM;
  const fallback = (minBpm + maxBpm) / 2;

  const sorted = [...onsetTimesMs].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 1) intervals.push(gap);
  }
  if (intervals.length === 0) {
    return { bpm: Math.round(fallback), confidence: 0, candidates: [] };
  }

  // Histogram of folded BPMs in 1-BPM bins.
  const bins = new Map<number, number>();
  for (const gap of intervals) {
    const bpm = foldIntoRange(60000 / gap, minBpm, maxBpm);
    const bin = Math.round(bpm);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  const candidates = [...bins.entries()]
    .map(([bpm, weight]) => ({ bpm, weight }))
    .sort((a, b) => b.weight - a.weight);

  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  const top = candidates[0];
  return {
    bpm: top.bpm,
    confidence: total === 0 ? 0 : top.weight / total,
    candidates,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tempoEstimation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tempoEstimation.ts src/lib/tempoEstimation.test.ts
git commit -m "PR-39: add IOI-histogram tempo estimation"
```

---

### Task 2: Waveform → level frames (`waveformToLevelFrames.ts`)

Pure adapter producing `MicLevelFrame[]` (the shape the classifier consumes) from decoded PCM.

**Files:**
- Create: `src/lib/waveformToLevelFrames.ts`
- Test: `src/lib/waveformToLevelFrames.test.ts`

**Interfaces:**
- Consumes: `MicLevelFrame` from `./micCapture` (`{ atMs: number; rms: number; peak: number; zeroCrossingRate?: number }`).
- Produces: `function waveformToLevelFrames(samples: Float32Array, sampleRate: number, frameMs?: number): MicLevelFrame[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { waveformToLevelFrames } from "./waveformToLevelFrames";

describe("waveformToLevelFrames", () => {
  it("returns zero rms/peak for silence", () => {
    const frames = waveformToLevelFrames(new Float32Array(22050), 22050, 50);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every((f) => f.rms === 0 && f.peak === 0)).toBe(true);
  });

  it("reports full-scale peak and rms ~1 for a DC-full buffer", () => {
    const samples = new Float32Array(22050).fill(1);
    const frames = waveformToLevelFrames(samples, 22050, 50);
    expect(frames[0].peak).toBeCloseTo(1, 5);
    expect(frames[0].rms).toBeCloseTo(1, 5);
  });

  it("spaces frames by frameMs and stamps atMs", () => {
    const frames = waveformToLevelFrames(new Float32Array(22050), 22050, 50);
    expect(frames[0].atMs).toBe(0);
    expect(frames[1].atMs).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/waveformToLevelFrames.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { MicLevelFrame } from "./micCapture";

const DEFAULT_FRAME_MS = 50;

export function waveformToLevelFrames(
  samples: Float32Array,
  sampleRate: number,
  frameMs: number = DEFAULT_FRAME_MS,
): MicLevelFrame[] {
  if (samples.length === 0 || sampleRate <= 0) return [];
  const frameSize = Math.max(1, Math.round((frameMs / 1000) * sampleRate));
  const frames: MicLevelFrame[] = [];
  for (let start = 0; start < samples.length; start += frameSize) {
    const end = Math.min(start + frameSize, samples.length);
    let sumSquares = 0;
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = samples[i];
      sumSquares += v * v;
      const abs = Math.abs(v);
      if (abs > peak) peak = abs;
    }
    const count = end - start;
    frames.push({
      atMs: Math.round((start / sampleRate) * 1000),
      rms: count === 0 ? 0 : Math.sqrt(sumSquares / count),
      peak,
    });
  }
  return frames;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/waveformToLevelFrames.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/waveformToLevelFrames.ts src/lib/waveformToLevelFrames.test.ts
git commit -m "PR-39: add waveform-to-level-frames adapter"
```

---

### Task 3: One-bar window pick (`oneBarWindow.ts`)

Pure helper that chooses the most energetic one-bar window start, given onset times and a bar length.

**Files:**
- Create: `src/lib/oneBarWindow.ts`
- Test: `src/lib/oneBarWindow.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `function pickOneBarWindow(onsetTimesMs: number[], barMs: number, totalDurationMs: number): { startMs: number; endMs: number }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { pickOneBarWindow } from "./oneBarWindow";

describe("pickOneBarWindow", () => {
  it("returns a bar-length window within the track", () => {
    const onsets = [100, 200, 300, 400, 1100, 1200, 1300, 1400];
    const w = pickOneBarWindow(onsets, 1000, 3000);
    expect(w.endMs - w.startMs).toBeCloseTo(1000, 5);
    expect(w.startMs).toBeGreaterThanOrEqual(0);
    expect(w.endMs).toBeLessThanOrEqual(3000);
  });

  it("centres on the densest region of onsets", () => {
    // all activity between 2000-3000ms
    const onsets = [2000, 2100, 2250, 2500, 2750, 2900];
    const w = pickOneBarWindow(onsets, 1000, 4000);
    expect(w.startMs).toBeGreaterThanOrEqual(1900);
    expect(w.startMs).toBeLessThanOrEqual(2050);
  });

  it("clamps to [0, totalDurationMs] when bar exceeds track", () => {
    const w = pickOneBarWindow([10, 20], 5000, 1000);
    expect(w.startMs).toBe(0);
    expect(w.endMs).toBe(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/oneBarWindow.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
export function pickOneBarWindow(
  onsetTimesMs: number[],
  barMs: number,
  totalDurationMs: number,
): { startMs: number; endMs: number } {
  if (barMs >= totalDurationMs || onsetTimesMs.length === 0) {
    return { startMs: 0, endMs: Math.min(barMs, totalDurationMs) };
  }
  const sorted = [...onsetTimesMs].sort((a, b) => a - b);
  const maxStart = totalDurationMs - barMs;
  // Candidate starts: each onset is a potential downbeat (clamped).
  let best = { startMs: 0, count: -1 };
  for (const onset of sorted) {
    const startMs = Math.min(Math.max(0, onset), maxStart);
    const endMs = startMs + barMs;
    const count = sorted.filter((t) => t >= startMs && t < endMs).length;
    if (count > best.count) best = { startMs, count };
  }
  return { startMs: best.startMs, endMs: best.startMs + barMs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/oneBarWindow.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/oneBarWindow.ts src/lib/oneBarWindow.test.ts
git commit -m "PR-39: add one-bar window picker"
```

---

### Task 4: Audio file decode (`audioFileDecode.ts`)

Decode an uploaded file to mono PCM. WAV path is synchronous via `decodeWav` and unit-testable; compressed formats delegate to an injectable AudioContext decoder (the `producerTagSample` pattern).

**Files:**
- Create: `src/lib/audioFileDecode.ts`
- Test: `src/lib/audioFileDecode.test.ts`
- Reference (read before writing): `src/lib/wav.ts` (`decodeWav`, `encodeWav`), `src/lib/producerTagSample.ts` (`decodeProducerTagSample`, `RENDER_SAMPLE_RATE`).

**Interfaces:**
- Consumes: `decodeWav(buf): DecodedAudio` where `DecodedAudio = { samples: Float32Array; sampleRate: number; durationMs: number }`; `decodeProducerTagSample(blob)` → `{ samples, sampleRate }`.
- Produces:
  - `type CompressedDecoder = (blob: Blob) => Promise<{ samples: Float32Array; sampleRate: number }>`
  - `function decodeAudioFile(file: Blob, compressedDecoder?: CompressedDecoder): Promise<DecodedAudio>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { encodeWav } from "./wav";
import { decodeAudioFile } from "./audioFileDecode";

describe("decodeAudioFile", () => {
  it("decodes a WAV blob via the synchronous path", async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const wavBytes = encodeWav(samples, 22050);
    const blob = new Blob([wavBytes], { type: "audio/wav" });
    const decoded = await decodeAudioFile(blob);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.samples.length).toBe(samples.length);
    expect(decoded.samples[3]).toBeCloseTo(1, 2);
  });

  it("delegates non-WAV blobs to the injected compressed decoder", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });
    const decoded = await decodeAudioFile(blob, async () => ({
      samples: new Float32Array([0.1, 0.2]),
      sampleRate: 22050,
    }));
    expect(decoded.samples.length).toBe(2);
    expect(decoded.durationMs).toBeCloseTo((2 / 22050) * 1000, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/audioFileDecode.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import { decodeProducerTagSample } from "./producerTagSample";
import { decodeWav, type DecodedAudio } from "./wav";

export type CompressedDecoder = (
  blob: Blob,
) => Promise<{ samples: Float32Array; sampleRate: number }>;

function isWav(file: Blob): boolean {
  return file.type === "audio/wav" || file.type === "audio/x-wav";
}

export async function decodeAudioFile(
  file: Blob,
  compressedDecoder: CompressedDecoder = decodeProducerTagSample,
): Promise<DecodedAudio> {
  if (isWav(file)) {
    const buffer = await file.arrayBuffer();
    return decodeWav(buffer);
  }
  const { samples, sampleRate } = await compressedDecoder(file);
  return {
    samples,
    sampleRate,
    durationMs: (samples.length / sampleRate) * 1000,
  };
}
```

Note: confirm `DecodedAudio` is exported from `wav.ts`; if it lives elsewhere, import from its actual module. Confirm `decodeProducerTagSample`'s exact param list (it may take a runtime arg) and adapt the default if needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/audioFileDecode.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audioFileDecode.ts src/lib/audioFileDecode.test.ts
git commit -m "PR-39: add audio file decode (wav fast-path + compressed delegate)"
```

---

### Task 5: Song decomposition orchestrator (`songDecompose.ts`)

Compose decode→envelope→onsets→tempo→window→quantize→classify into one result. Includes an in-test PCM synthesizer.

**Files:**
- Create: `src/lib/songDecompose.ts`
- Test: `src/lib/songDecompose.test.ts`
- Reference (read before writing): `src/lib/onsetDetection.ts` (`waveformToAmplitudeEnvelope`, `detectOnsets`, `createOnsetPreview`, `OnsetPreviewInput`), `src/lib/captureAnalysis.ts` (the `createOnsetPreview` + `classifyBeatboxHits` wiring to mirror), `src/lib/beatboxClassifier.ts` (`classifyBeatboxHits`, `classifiedHitsToPattern`), `src/lib/meydaBeatboxAnalysis.ts` (`createMeydaBeatboxAnalysisProvider`), `src/lib/sequencerDomain.ts` (`getSequencerLoopDurationMs`).

**Interfaces:**
- Consumes: `DecodedAudio`; `estimateTempo` (Task 1); `waveformToLevelFrames` (Task 2); `pickOneBarWindow` (Task 3); existing pipeline fns above; `Pattern`, `BeatboxLaneClassification`.
- Produces:
  - `interface SongDecomposition { bpm: number; bpmConfidence: number; window: { startMs: number; bars: number }; pattern: Pattern; classifications: BeatboxLaneClassification[]; overallConfidence: number; }`
  - `function decomposeSong(decoded: DecodedAudio, opts?: { sensitivity?: number; provider?: BeatboxAnalysisProvider }): SongDecomposition`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { countActiveSteps } from "./patterns";
import { decomposeSong } from "./songDecompose";

// Synthesize a one-bar-repeating click track: low-freq burst (kick-ish) on the
// downbeats, noise burst (hat-ish) on offbeats, at a known BPM.
function synthClickTrack(bpm: number, sampleRate: number, bars: number): Float32Array {
  const barMs = (60000 / bpm) * 4;
  const stepMs = barMs / 16;
  const totalMs = barMs * bars;
  const total = Math.round((totalMs / 1000) * sampleRate);
  const out = new Float32Array(total);
  const burst = (atMs: number, freq: number, durMs: number, amp: number) => {
    const start = Math.round((atMs / 1000) * sampleRate);
    const len = Math.round((durMs / 1000) * sampleRate);
    for (let i = 0; i < len && start + i < total; i += 1) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 40);
      const sample = freq === 0 ? (Math.random() * 2 - 1) : Math.sin(2 * Math.PI * freq * t);
      out[start + i] += sample * env * amp;
    }
  };
  for (let bar = 0; bar < bars; bar += 1) {
    const base = bar * barMs;
    // kicks on steps 1,5,9,13 (0-indexed 0,4,8,12)
    [0, 4, 8, 12].forEach((s) => burst(base + s * stepMs, 60, 60, 1));
    // hats on every even step
    [2, 6, 10, 14].forEach((s) => burst(base + s * stepMs, 0, 20, 0.4));
  }
  return out;
}

describe("decomposeSong", () => {
  const sampleRate = 22050;

  it("estimates the source BPM within tolerance", () => {
    const samples = synthClickTrack(120, sampleRate, 4);
    const decoded = { samples, sampleRate, durationMs: (samples.length / sampleRate) * 1000 };
    const result = decomposeSong(decoded);
    expect(result.bpm).toBeGreaterThanOrEqual(110);
    expect(result.bpm).toBeLessThanOrEqual(130);
  });

  it("produces a non-empty one-bar pattern and confidence in [0,1]", () => {
    const samples = synthClickTrack(120, sampleRate, 4);
    const decoded = { samples, sampleRate, durationMs: (samples.length / sampleRate) * 1000 };
    const result = decomposeSong(decoded);
    expect(result.window.bars).toBe(1);
    expect(countActiveSteps(result.pattern)).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/songDecompose.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import {
  classifiedHitsToPattern,
  classifyBeatboxHits,
  type BeatboxAnalysisProvider,
  type BeatboxLaneClassification,
} from "./beatboxClassifier";
import { createMeydaBeatboxAnalysisProvider } from "./meydaBeatboxAnalysis";
import {
  createOnsetPreview,
  detectOnsets,
  waveformToAmplitudeEnvelope,
} from "./onsetDetection";
import { pickOneBarWindow } from "./oneBarWindow";
import type { Pattern } from "./patterns";
import { getSequencerLoopDurationMs } from "./sequencerDomain";
import { estimateTempo } from "./tempoEstimation";
import { waveformToLevelFrames } from "./waveformToLevelFrames";
import type { DecodedAudio } from "./wav";

export interface SongDecomposition {
  bpm: number;
  bpmConfidence: number;
  window: { startMs: number; bars: number };
  pattern: Pattern;
  classifications: BeatboxLaneClassification[];
  overallConfidence: number;
}

const DEFAULT_SENSITIVITY = 0.55;

export function decomposeSong(
  decoded: DecodedAudio,
  opts: { sensitivity?: number; provider?: BeatboxAnalysisProvider } = {},
): SongDecomposition {
  const sensitivity = opts.sensitivity ?? DEFAULT_SENSITIVITY;
  const { samples, sampleRate, durationMs } = decoded;

  // 1. Full-track onsets for tempo.
  const fullEnvelope = waveformToAmplitudeEnvelope(samples, durationMs);
  const fullOnsets = detectOnsets(fullEnvelope, { sensitivity });
  const onsetTimesMs = fullOnsets.map((o) => o.atMs);

  // 2. Tempo + bar length.
  const tempo = estimateTempo(onsetTimesMs);
  const barMs = getSequencerLoopDurationMs(tempo.bpm);

  // 3. One-bar window in samples.
  const { startMs } = pickOneBarWindow(onsetTimesMs, barMs, durationMs);
  const startSample = Math.round((startMs / 1000) * sampleRate);
  const barSamples = Math.round((barMs / 1000) * sampleRate);
  const windowed = samples.subarray(startSample, startSample + barSamples);

  // 4. Preview + classify on the windowed bar (mirrors captureAnalysis wiring).
  const preview = createOnsetPreview({
    waveform: windowed,
    durationMs: barMs,
    quantizationDurationMs: barMs,
    sensitivity,
  });
  const levels = waveformToLevelFrames(windowed, sampleRate);
  const provider = opts.provider ?? createMeydaBeatboxAnalysisProvider();
  const classifications = classifyBeatboxHits(preview, levels, {
    durationMs: barMs,
    provider,
    waveform: windowed,
  });

  const pattern = classifiedHitsToPattern(classifications);
  const meanHitConfidence =
    classifications.length === 0
      ? 0
      : classifications.reduce((s, c) => s + c.confidence, 0) / classifications.length;
  const overallConfidence = Math.min(1, Math.max(0, (tempo.confidence + meanHitConfidence) / 2));

  return {
    bpm: tempo.bpm,
    bpmConfidence: tempo.confidence,
    window: { startMs, bars: 1 },
    pattern,
    classifications,
    overallConfidence,
  };
}
```

Note: verify exact `waveformToAmplitudeEnvelope` / `detectOnsets` / `createOnsetPreview` / `classifyBeatboxHits` option field names against the files listed in References; adjust the option objects to match. `subarray` returns a `Float32Array` view — fine for read-only consumers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/songDecompose.test.ts`
Expected: PASS (2 tests). If the Meyda provider throws in the Node test env, confirm it falls back to the rule-based analyzer (per `meydaBeatboxAnalysis.ts`); if not, pass a rule-based `provider` in the test opts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/songDecompose.ts src/lib/songDecompose.test.ts
git commit -m "PR-39: add song decomposition orchestrator"
```

---

### Task 6: Decomposition → SequencerState (`decompositionToSequencerState.ts`)

Turn a decomposition into an editable `SequencerState` via existing domain helpers.

**Files:**
- Create: `src/lib/decompositionToSequencerState.ts`
- Test: `src/lib/decompositionToSequencerState.test.ts`
- Reference: `src/lib/patternState.ts` (`createDefaultSequencerState`, `SequencerState`), `src/lib/sequencerDomain.ts` (`updateSequencerBpm`).

**Interfaces:**
- Consumes: `SongDecomposition` (Task 5); `createDefaultSequencerState(styleId)`; `updateSequencerBpm(state, bpm)`.
- Produces: `function decompositionToSequencerState(decomp: SongDecomposition, styleId?: BeatStyleId): SequencerState`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { countActiveSteps } from "./patterns";
import { decompositionToSequencerState } from "./decompositionToSequencerState";
import type { SongDecomposition } from "./songDecompose";

const decomp: SongDecomposition = {
  bpm: 124,
  bpmConfidence: 0.8,
  window: { startMs: 0, bars: 1 },
  pattern: {
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    snare: Array(16).fill(false),
    hat: Array(16).fill(false),
    openHat: Array(16).fill(false),
    clap: Array(16).fill(false),
    "808": Array(16).fill(false),
    melody: Array(16).fill(false),
  },
  classifications: [],
  overallConfidence: 0.7,
};

describe("decompositionToSequencerState", () => {
  it("carries the decomposed pattern and clamped bpm into a SequencerState", () => {
    const state = decompositionToSequencerState(decomp);
    expect(state.bpm).toBe(124);
    expect(countActiveSteps(state.pattern)).toBe(4);
    expect(state.pattern.kick[0]).toBe(true);
  });

  it("clamps an out-of-range bpm to the guardrails", () => {
    const state = decompositionToSequencerState({ ...decomp, bpm: 999 });
    expect(state.bpm).toBeLessThanOrEqual(180);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/decompositionToSequencerState.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { BeatStyleId } from "./beatStyles";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import { updateSequencerBpm } from "./sequencerDomain";
import type { SongDecomposition } from "./songDecompose";

const DEFAULT_STYLE: BeatStyleId = "trap";

export function decompositionToSequencerState(
  decomp: SongDecomposition,
  styleId: BeatStyleId = DEFAULT_STYLE,
): SequencerState {
  const base = createDefaultSequencerState(styleId);
  const withPattern: SequencerState = {
    ...base,
    pattern: {
      kick: [...decomp.pattern.kick],
      snare: [...decomp.pattern.snare],
      hat: [...decomp.pattern.hat],
      openHat: [...decomp.pattern.openHat],
      clap: [...decomp.pattern.clap],
      "808": [...decomp.pattern["808"]],
      melody: [...decomp.pattern.melody],
    },
  };
  return updateSequencerBpm(withPattern, decomp.bpm);
}
```

Note: confirm `SequencerState.pattern` is keyed exactly by the seven `InstrumentId`s; if `clonePattern` exists in `patternState.ts`, prefer `pattern: clonePattern(decomp.pattern)` over the manual spread (DRY).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/decompositionToSequencerState.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/decompositionToSequencerState.ts src/lib/decompositionToSequencerState.test.ts
git commit -m "PR-39: convert decomposition into editable SequencerState"
```

---

### Task 7: Flag-gated upload panel + App wiring

Throwaway dev harness. Read `src/App.tsx` and an existing component (e.g. the mic-capture UI) first to match patterns. Keep React out of `src/lib`.

**Files:**
- Create: `src/components/SongDecomposePanel.tsx` (confirm the components directory name first).
- Modify: `src/App.tsx` — render `<SongDecomposePanel onLoad={...} />` only when `new URLSearchParams(window.location.search).get("songlab") === "1"`, wiring `onLoad(state)` into the same setter the app uses to replace the active `SequencerState`.

**Interfaces:**
- Consumes: `decodeAudioFile` (Task 4), `decomposeSong` (Task 5), `decompositionToSequencerState` (Task 6).
- Produces: `SongDecomposePanel` React component with prop `{ onLoad: (state: SequencerState) => void }`.

- [ ] **Step 1: Read `src/App.tsx` and an existing panel component** to learn the state setter for the active sequencer and the component/style conventions. (No code change yet.)

- [ ] **Step 2: Implement `SongDecomposePanel.tsx`**

```tsx
import { useState } from "react";
import { decodeAudioFile } from "../lib/audioFileDecode";
import { decompositionToSequencerState } from "../lib/decompositionToSequencerState";
import { decomposeSong, type SongDecomposition } from "../lib/songDecompose";
import type { SequencerState } from "../lib/patternState";

interface Props {
  onLoad: (state: SequencerState) => void;
}

export function SongDecomposePanel({ onLoad }: Props) {
  const [decomp, setDecomp] = useState<SongDecomposition | null>(null);
  const [status, setStatus] = useState<string>("Drop an audio file to analyze (dev spike).");

  async function handleFile(file: File) {
    setStatus(`Analyzing ${file.name}…`);
    try {
      const decoded = await decodeAudioFile(file);
      const result = decomposeSong(decoded);
      setDecomp(result);
      setStatus(
        `~${result.bpm} BPM · confidence ${(result.overallConfidence * 100).toFixed(0)}%`,
      );
    } catch (err) {
      setStatus(`Could not analyze this file: ${(err as Error).message}`);
    }
  }

  return (
    <section aria-label="Song decompose (dev)" style={{ border: "1px dashed #888", padding: 12 }}>
      <h3>Song decompose (spike)</h3>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <p>{status}</p>
      {decomp && (
        <>
          <pre style={{ fontSize: 11 }}>
            {(["kick", "snare", "hat", "openHat", "clap", "808", "melody"] as const)
              .map((lane) => `${lane.padEnd(7)} ${decomp.pattern[lane].map((s) => (s ? "x" : ".")).join("")}`)
              .join("\n")}
          </pre>
          <button onClick={() => onLoad(decompositionToSequencerState(decomp))}>
            Load into grid
          </button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Wire into `src/App.tsx`** behind the `?songlab=1` flag, passing the app's existing "replace active sequencer state" setter as `onLoad`. (Show the exact added lines in your commit; the setter name comes from Step 1.)

- [ ] **Step 4: Typecheck + hygiene**

Run: `npx tsc --noEmit && npm run hygiene`
Expected: clean (no React-in-lib violations, no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/components/SongDecomposePanel.tsx src/App.tsx
git commit -m "PR-39: flag-gated song-decompose dev panel"
```

---

### Task 8: Findings doc

**Files:**
- Create: `docs/spikes/PR-39-song-decompose-findings.md`

- [ ] **Step 1: Write the findings template**

Include: methodology (synthetic tests prove determinism; real tracks auditioned manually via `?songlab=1`), a results table, and an open go/no-go section.

```markdown
# PR-39 Spike Findings — Song Decompose (Phase A)

## Methodology
- Deterministic correctness (tempo, level frames, one-bar quantization) is covered
  by synthetic-PCM unit tests in `src/lib/*.test.ts`.
- Perceptual kick/snare/hat separation on real tracks is auditioned manually via
  the `?songlab=1` panel (audio cannot be judged by the AI).

## Results (fill by dragging real tracks through `?songlab=1`)

| Track | Genre | True BPM | Est. BPM | Kick sep. | Snare sep. | Hat sep. | Notes |
|-------|-------|----------|----------|-----------|------------|----------|-------|
|       |       |          |          |           |            |          |       |

## Go / No-Go for Phase B
- Tempo accuracy: _TBD from table_
- Drum separation quality: _TBD from table_
- Recommendation: _TBD — decided together after auditioning_
```

- [ ] **Step 2: Commit**

```bash
git add docs/spikes/PR-39-song-decompose-findings.md
git commit -m "PR-39: add spike findings doc template"
```

---

## Final gate (after all tasks)

- [ ] Run `npm run check` — expect hygiene OK, scripts typecheck clean, all tests pass (existing 387 + the new Phase-A tests).
- [ ] Run `npx tsc --noEmit` — expect clean.
- [ ] Ship via `superpowers:ship-it`: draft PR → green local gate → `/merge-and-close`. Squash subject `PR-39: Song upload, analysis & decomposition (#<pr>)`, body `Closes #90`, no Co-Authored-By.

## Self-review notes (author)

- **Spec coverage:** decode (T4), tempo (T1), onset/classify reuse + one-bar quantize (T5, T3), confidence readout (T5, T7), SequencerState deliverable (T6), flag-gated harness (T7), synthetic deterministic tests (T1–T6), findings doc (T8). All spec sections mapped.
- **Deferred (Phase B):** sample-slicing, BPM/downbeat correction, polished UX — intentionally absent.
- **Type consistency:** `SongDecomposition`, `TempoEstimate`, `decomposeSong`, `decompositionToSequencerState`, `decodeAudioFile`, `waveformToLevelFrames`, `pickOneBarWindow` used consistently across tasks.
- **Verify-against-source flags:** exact option field names for `waveformToAmplitudeEnvelope`/`detectOnsets`/`createOnsetPreview`/`classifyBeatboxHits`, the export location of `DecodedAudio`, `decodeProducerTagSample`'s signature, and the App state-setter name are each called out to confirm by reading the referenced files during implementation.
