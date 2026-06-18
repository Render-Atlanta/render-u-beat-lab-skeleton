# Reference Profile Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline Node/TS tool that decodes a developer's own WAV file into a reviewable JSON draft profile (tempo, feel BPM, onset density, swing, plain notes) for hand-adding to `STYLE_REFERENCES`.

**Architecture:** Pure domain functions (`wav.ts` decode, `referenceAnalysis.ts` measurement, `referenceProfile.ts` normalization/validation) plus a thin I/O shell (`scripts/analyze-reference.ts`). All logic with interesting behavior is fixture-tested with vitest; only file I/O lives untested in the shell. Reuses existing `onsetDetection.ts` for envelope + onset detection.

**Tech Stack:** TypeScript, vitest, `tsx` (script runner), existing `src/lib/onsetDetection.ts`.

## Global Constraints

- No copyrighted/real audio committed to the repo — tests use synthetic buffers only.
- Generated profiles are educational metadata only; the tool never writes into `STYLE_REFERENCES`.
- Stay in the TS/Node toolchain — no Python, no native deps.
- WAV input only (16/24/32-bit PCM + 32-bit float); other formats out of scope.
- All new pure modules live in `src/lib/`; the CLI shell lives in `scripts/`.
- Tests run with `npx vitest run <file>`; typecheck with `npx tsc --noEmit`.
- Follow existing code style: named exports, explicit interfaces, small focused functions.

---

### Task 1: WAV decoder

**Files:**
- Create: `src/lib/wav.ts`
- Test: `src/lib/wav.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `decodeWav(buffer: ArrayBufferView | ArrayBuffer): DecodedAudio` where
  `interface DecodedAudio { samples: Float32Array; sampleRate: number; durationMs: number }`.
  Mono downmix (average channels). Supports PCM 16/24/32-bit int and 32-bit float. Throws `Error` on non-RIFF/WAVE input or unsupported formats.

- [ ] **Step 1: Write the failing test**

Create `src/lib/wav.test.ts`. Use a helper that builds a minimal canonical WAV byte buffer so tests stay synthetic (no real audio).

```ts
import { describe, expect, it } from "vitest";
import { decodeWav } from "./wav";

// Build a canonical PCM WAV in-memory. channels interleaved.
function buildWav(
  channels: number[][],
  sampleRate: number,
  bitsPerSample: number,
  format: 1 | 3 = 1, // 1 = PCM int, 3 = IEEE float
): ArrayBuffer {
  const numChannels = channels.length;
  const numFrames = channels[0].length;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataBytes = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const sample = channels[ch][frame];
      if (format === 3) {
        view.setFloat32(offset, sample, true);
      } else if (bitsPerSample === 16) {
        view.setInt16(offset, Math.round(sample * 32767), true);
      } else if (bitsPerSample === 32) {
        view.setInt32(offset, Math.round(sample * 2147483647), true);
      } else if (bitsPerSample === 24) {
        const v = Math.round(sample * 8388607);
        view.setUint8(offset, v & 0xff);
        view.setUint8(offset + 1, (v >> 8) & 0xff);
        view.setUint8(offset + 2, (v >> 16) & 0xff);
      }
      offset += bytesPerSample;
    }
  }
  return buffer;
}

describe("decodeWav", () => {
  it("decodes 16-bit PCM mono", () => {
    const wav = buildWav([[0, 0.5, -0.5, 1]], 8000, 16);
    const decoded = decodeWav(wav);
    expect(decoded.sampleRate).toBe(8000);
    expect(decoded.samples).toHaveLength(4);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[3]).toBeCloseTo(1, 2);
    expect(decoded.durationMs).toBeCloseTo((4 / 8000) * 1000, 3);
  });

  it("downmixes stereo to mono by averaging channels", () => {
    const wav = buildWav([[1, 0], [0, 1]], 8000, 16);
    const decoded = decodeWav(wav);
    expect(decoded.samples[0]).toBeCloseTo(0.5, 2);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 2);
  });

  it("decodes 32-bit float PCM", () => {
    const wav = buildWav([[0.25, -0.75]], 16000, 32, 3);
    const decoded = decodeWav(wav);
    expect(decoded.sampleRate).toBe(16000);
    expect(decoded.samples[0]).toBeCloseTo(0.25, 4);
    expect(decoded.samples[1]).toBeCloseTo(-0.75, 4);
  });

  it("throws on non-WAV input", () => {
    const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => decodeWav(bad)).toThrow(/not a WAV|RIFF/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/wav.test.ts`
Expected: FAIL — `decodeWav` is not defined / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/wav.ts`:

```ts
export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  durationMs: number;
}

export function decodeWav(input: ArrayBufferView | ArrayBuffer): DecodedAudio {
  const buffer =
    input instanceof ArrayBuffer
      ? input
      : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const view = new DataView(buffer);

  if (buffer.byteLength < 12 || readStr(view, 0, 4) !== "RIFF" || readStr(view, 8, 4) !== "WAVE") {
    throw new Error("Input is not a WAV file (missing RIFF/WAVE header)");
  }

  let offset = 12;
  let format = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readStr(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === "fmt ") {
      format = view.getUint16(body, true);
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (dataOffset < 0 || numChannels === 0 || sampleRate === 0) {
    throw new Error("WAV file missing fmt or data chunk");
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * numChannels));
  const samples = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch += 1) {
      const pos = dataOffset + (frame * numChannels + ch) * bytesPerSample;
      sum += readSample(view, pos, bitsPerSample, format);
    }
    samples[frame] = sum / numChannels;
  }

  return { samples, sampleRate, durationMs: (frameCount / sampleRate) * 1000 };
}

function readSample(view: DataView, pos: number, bits: number, format: number): number {
  if (format === 3) return view.getFloat32(pos, true);
  if (bits === 16) return view.getInt16(pos, true) / 32768;
  if (bits === 32) return view.getInt32(pos, true) / 2147483648;
  if (bits === 24) {
    const b0 = view.getUint8(pos);
    const b1 = view.getUint8(pos + 1);
    const b2 = view.getUint8(pos + 2);
    let v = b0 | (b1 << 8) | (b2 << 16);
    if (v & 0x800000) v -= 0x1000000; // sign-extend
    return v / 8388608;
  }
  throw new Error(`Unsupported WAV sample format: ${bits}-bit, format ${format}`);
}

function readStr(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/wav.test.ts`
Expected: PASS (4 tests). Then `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wav.ts src/lib/wav.test.ts
git commit -m "PR-15 - Add pure-JS WAV decoder (#21)"
```

---

### Task 2: Waveform measurement

**Files:**
- Create: `src/lib/referenceAnalysis.ts`
- Test: `src/lib/referenceAnalysis.test.ts`

**Interfaces:**
- Consumes: `waveformToAmplitudeEnvelope`, `detectOnsets` from `./onsetDetection`.
- Produces:
  ```ts
  interface MeasuredProfile {
    detectedBpm: number;
    tempoConfidence: number;   // 0..1
    onsetCount: number;
    onsetDensityPerSec: number;
    durationSec: number;
  }
  function analyzeWaveform(samples: ArrayLike<number>, sampleRate: number): MeasuredProfile
  ```
  Tempo from inter-onset intervals folded into 60–200 BPM; confidence = share of intervals within ±5% of the dominant BPM. Empty/too-short input → zeros with `detectedBpm: 0`, `tempoConfidence: 0`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/referenceAnalysis.test.ts`. Build a synthetic click-track: short impulses at a fixed interval over a fixed duration.

```ts
import { describe, expect, it } from "vitest";
import { analyzeWaveform } from "./referenceAnalysis";

// Impulses every `intervalMs` for `durationSec`, at `sampleRate`.
function clickTrack(intervalMs: number, durationSec: number, sampleRate: number): Float32Array {
  const total = Math.round(durationSec * sampleRate);
  const samples = new Float32Array(total);
  const stride = Math.round((intervalMs / 1000) * sampleRate);
  for (let i = 0; i < total; i += stride) {
    // a few-sample decaying impulse so the envelope sees a clear peak
    for (let k = 0; k < 8 && i + k < total; k += 1) samples[i + k] = 1 - k / 8;
  }
  return samples;
}

describe("analyzeWaveform", () => {
  it("detects 120 BPM from a 500ms click track", () => {
    const samples = clickTrack(500, 8, 22050); // 500ms => 120 BPM
    const result = analyzeWaveform(samples, 22050);
    expect(result.detectedBpm).toBeGreaterThanOrEqual(116);
    expect(result.detectedBpm).toBeLessThanOrEqual(124);
    expect(result.tempoConfidence).toBeGreaterThan(0.5);
    expect(result.durationSec).toBeCloseTo(8, 1);
    expect(result.onsetCount).toBeGreaterThan(10);
    expect(result.onsetDensityPerSec).toBeGreaterThan(1.5);
  });

  it("returns zeros for empty input", () => {
    const result = analyzeWaveform(new Float32Array(0), 22050);
    expect(result.detectedBpm).toBe(0);
    expect(result.tempoConfidence).toBe(0);
    expect(result.onsetCount).toBe(0);
    expect(result.durationSec).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/referenceAnalysis.test.ts`
Expected: FAIL — `analyzeWaveform` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/referenceAnalysis.ts`:

```ts
import { detectOnsets, waveformToAmplitudeEnvelope } from "./onsetDetection";

export interface MeasuredProfile {
  detectedBpm: number;
  tempoConfidence: number;
  onsetCount: number;
  onsetDensityPerSec: number;
  durationSec: number;
}

const MIN_BPM = 60;
const MAX_BPM = 200;

export function analyzeWaveform(
  samples: ArrayLike<number>,
  sampleRate: number,
): MeasuredProfile {
  const empty: MeasuredProfile = {
    detectedBpm: 0,
    tempoConfidence: 0,
    onsetCount: 0,
    onsetDensityPerSec: 0,
    durationSec: 0,
  };

  if (samples.length === 0 || sampleRate <= 0) return empty;

  const durationMs = (samples.length / sampleRate) * 1000;
  const durationSec = durationMs / 1000;
  // Resolve the envelope at roughly 10ms per bin for usable timing.
  const bins = Math.max(16, Math.round(durationMs / 10));
  const envelope = waveformToAmplitudeEnvelope(samples, durationMs, { bins, mode: "peak" });
  const onsets = detectOnsets(envelope);

  if (onsets.length < 2) {
    return { ...empty, durationSec, onsetCount: onsets.length, onsetDensityPerSec: onsets.length / durationSec };
  }

  const { bpm, confidence } = estimateTempo(onsets.map((o) => o.atMs));

  return {
    detectedBpm: bpm,
    tempoConfidence: confidence,
    onsetCount: onsets.length,
    onsetDensityPerSec: round(onsets.length / durationSec, 2),
    durationSec: round(durationSec, 3),
  };
}

function estimateTempo(times: number[]): { bpm: number; confidence: number } {
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i += 1) intervals.push(times[i] - times[i - 1]);

  // Convert each interval to a BPM folded into [MIN_BPM, MAX_BPM] by octaves.
  const bpms = intervals
    .map((ms) => foldBpm(60000 / ms))
    .filter((b) => Number.isFinite(b) && b > 0);
  if (bpms.length === 0) return { bpm: 0, confidence: 0 };

  // Bucket into 1-BPM bins, pick the peak.
  const counts = new Map<number, number>();
  for (const b of bpms) {
    const key = Math.round(b);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let peakBpm = 0;
  let peakCount = 0;
  for (const [bpm, count] of counts) {
    if (count > peakCount) {
      peakCount = count;
      peakBpm = bpm;
    }
  }

  const tolerance = peakBpm * 0.05;
  const within = bpms.filter((b) => Math.abs(b - peakBpm) <= tolerance).length;
  return { bpm: round(peakBpm, 1), confidence: round(within / bpms.length, 2) };
}

function foldBpm(bpm: number): number {
  let result = bpm;
  while (result > MAX_BPM) result /= 2;
  while (result < MIN_BPM) result *= 2;
  return result;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/referenceAnalysis.test.ts`
Expected: PASS (2 tests). Then `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/referenceAnalysis.ts src/lib/referenceAnalysis.test.ts
git commit -m "PR-15 - Add waveform tempo and density measurement (#21)"
```

---

### Task 3: Profile normalization and validation

**Files:**
- Create: `src/lib/referenceProfile.ts`
- Test: `src/lib/referenceProfile.test.ts`

**Interfaces:**
- Consumes: `MeasuredProfile` from `./referenceAnalysis`.
- Produces:
  ```ts
  interface StyleReferenceProfileMeta { artist?: string; title?: string; sourceUrl?: string }
  interface StyleReferenceProfileDraft {
    metadata: { artist: string; title: string; sourceUrl: string };
    bpm: number;
    feelBpm?: number;
    swing: "straight" | "light" | "medium" | "heavy";
    profile: string;
    measured: MeasuredProfile;
  }
  interface ValidationResult { valid: boolean; errors: string[] }
  function buildReferenceProfile(measured: MeasuredProfile, meta?: StyleReferenceProfileMeta): StyleReferenceProfileDraft
  function validateReferenceProfile(draft: StyleReferenceProfileDraft): ValidationResult
  ```
  Rules: `bpm = round(detectedBpm)`; `feelBpm = round(detectedBpm/2)` when `detectedBpm >= 140`, else omitted; `swing` defaults to `"straight"` (analyzer has no reliable swing signal yet — emit straight, reviewer adjusts); `profile` = generated note with density descriptor (`sparse` < 2/s, `moderate` 2–6/s, `busy` > 6/s).

- [ ] **Step 1: Write the failing test**

Create `src/lib/referenceProfile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MeasuredProfile } from "./referenceAnalysis";
import {
  buildReferenceProfile,
  validateReferenceProfile,
  type StyleReferenceProfileDraft,
} from "./referenceProfile";

const measured = (over: Partial<MeasuredProfile> = {}): MeasuredProfile => ({
  detectedBpm: 100,
  tempoConfidence: 0.8,
  onsetCount: 40,
  onsetDensityPerSec: 4,
  durationSec: 10,
  ...over,
});

describe("buildReferenceProfile", () => {
  it("rounds bpm and omits feelBpm below 140", () => {
    const draft = buildReferenceProfile(measured({ detectedBpm: 103.4 }));
    expect(draft.bpm).toBe(103);
    expect(draft.feelBpm).toBeUndefined();
    expect(draft.swing).toBe("straight");
  });

  it("derives half-time feelBpm at or above 140", () => {
    const draft = buildReferenceProfile(measured({ detectedBpm: 142 }));
    expect(draft.bpm).toBe(142);
    expect(draft.feelBpm).toBe(71);
  });

  it("describes density buckets in the profile note", () => {
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 1 })).profile).toMatch(/sparse/i);
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 4 })).profile).toMatch(/moderate/i);
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 8 })).profile).toMatch(/busy/i);
  });

  it("leaves metadata blank unless supplied", () => {
    const blank = buildReferenceProfile(measured());
    expect(blank.metadata).toEqual({ artist: "", title: "", sourceUrl: "" });
    const filled = buildReferenceProfile(measured(), { artist: "X", title: "Y", sourceUrl: "z" });
    expect(filled.metadata).toEqual({ artist: "X", title: "Y", sourceUrl: "z" });
  });

  it("carries the raw measured block through", () => {
    const m = measured();
    expect(buildReferenceProfile(m).measured).toEqual(m);
  });
});

describe("validateReferenceProfile", () => {
  const good = (): StyleReferenceProfileDraft => buildReferenceProfile(measured({ detectedBpm: 120 }));

  it("accepts a well-formed draft", () => {
    expect(validateReferenceProfile(good())).toEqual({ valid: true, errors: [] });
  });

  it("rejects out-of-range bpm", () => {
    const draft = { ...good(), bpm: 5 };
    const result = validateReferenceProfile(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/bpm/i);
  });

  it("rejects unknown swing label", () => {
    const draft = { ...good(), swing: "wobbly" as unknown as StyleReferenceProfileDraft["swing"] };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });

  it("rejects an empty profile note", () => {
    const draft = { ...good(), profile: "" };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/referenceProfile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/referenceProfile.ts`:

```ts
import type { MeasuredProfile } from "./referenceAnalysis";

export type SwingLabel = "straight" | "light" | "medium" | "heavy";
const SWING_LABELS: SwingLabel[] = ["straight", "light", "medium", "heavy"];

export interface StyleReferenceProfileMeta {
  artist?: string;
  title?: string;
  sourceUrl?: string;
}

export interface StyleReferenceProfileDraft {
  metadata: { artist: string; title: string; sourceUrl: string };
  bpm: number;
  feelBpm?: number;
  swing: SwingLabel;
  profile: string;
  measured: MeasuredProfile;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const FEEL_BPM_THRESHOLD = 140;

export function buildReferenceProfile(
  measured: MeasuredProfile,
  meta: StyleReferenceProfileMeta = {},
): StyleReferenceProfileDraft {
  const bpm = Math.round(measured.detectedBpm);
  const feelBpm =
    measured.detectedBpm >= FEEL_BPM_THRESHOLD ? Math.round(measured.detectedBpm / 2) : undefined;

  const draft: StyleReferenceProfileDraft = {
    metadata: {
      artist: meta.artist ?? "",
      title: meta.title ?? "",
      sourceUrl: meta.sourceUrl ?? "",
    },
    bpm,
    swing: "straight",
    profile: buildNote(bpm, feelBpm, measured.onsetDensityPerSec),
    measured,
  };
  if (feelBpm !== undefined) draft.feelBpm = feelBpm;
  return draft;
}

export function validateReferenceProfile(draft: StyleReferenceProfileDraft): ValidationResult {
  const errors: string[] = [];
  if (!Number.isFinite(draft.bpm) || draft.bpm < 40 || draft.bpm > 300) {
    errors.push(`bpm out of range (40-300): ${draft.bpm}`);
  }
  if (!SWING_LABELS.includes(draft.swing)) {
    errors.push(`unknown swing label: ${draft.swing}`);
  }
  if (!draft.profile || draft.profile.trim().length === 0) {
    errors.push("profile note is empty");
  }
  if (!draft.measured || draft.measured.durationSec < 0 || draft.measured.onsetDensityPerSec < 0) {
    errors.push("measured block missing or has negative values");
  }
  return { valid: errors.length === 0, errors };
}

function densityDescriptor(densityPerSec: number): string {
  if (densityPerSec < 2) return "sparse";
  if (densityPerSec <= 6) return "moderate";
  return "busy";
}

function buildNote(bpm: number, feelBpm: number | undefined, densityPerSec: number): string {
  const feel = feelBpm !== undefined ? ` (half-time feel ~${feelBpm})` : "";
  const density = densityDescriptor(densityPerSec);
  return `Detected ~${bpm} BPM${feel}. ${capitalize(density)} onset density (${densityPerSec}/s).`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/referenceProfile.test.ts`
Expected: PASS. Then `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/referenceProfile.ts src/lib/referenceProfile.test.ts
git commit -m "PR-15 - Add reference profile normalization and validation (#21)"
```

---

### Task 4: CLI shell, tsx wiring, and docs

**Files:**
- Create: `scripts/analyze-reference.ts`
- Create: `scripts/README.md`
- Modify: `package.json` (add `analyze:reference` script + `tsx` devDependency)
- Modify: `.gitignore` (ignore scratch audio + generated profiles)

**Interfaces:**
- Consumes: `decodeWav` (Task 1), `analyzeWaveform` (Task 2), `buildReferenceProfile` (Task 3).
- Produces: a runnable CLI. No unit test (I/O shell); verified by a manual run against a generated WAV.

- [ ] **Step 1: Add tsx and the npm script**

Run:
```bash
npm install --save-dev tsx
```

Then edit `package.json` `scripts` to add:
```jsonc
"analyze:reference": "tsx scripts/analyze-reference.ts"
```

- [ ] **Step 2: Write the CLI shell**

Create `scripts/analyze-reference.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { decodeWav } from "../src/lib/wav";
import { analyzeWaveform } from "../src/lib/referenceAnalysis";
import { buildReferenceProfile } from "../src/lib/referenceProfile";

interface Args {
  file?: string;
  out?: string;
  artist?: string;
  title?: string;
  source?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--out") args.out = argv[++i];
    else if (token === "--artist") args.artist = argv[++i];
    else if (token === "--title") args.title = argv[++i];
    else if (token === "--source") args.source = argv[++i];
    else if (!token.startsWith("--") && !args.file) args.file = token;
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Usage: npm run analyze:reference -- <file.wav> [--out f.json] [--artist] [--title] [--source]");
    process.exit(1);
  }

  let buffer: Buffer;
  try {
    buffer = readFileSync(args.file);
  } catch (error) {
    console.error(`Could not read file: ${args.file}`);
    process.exit(1);
  }

  let decoded;
  try {
    decoded = decodeWav(buffer);
  } catch (error) {
    console.error(`Failed to decode WAV (${args.file}): ${(error as Error).message}`);
    console.error("Convert other formats first, e.g.: ffmpeg -i in.mp3 out.wav");
    process.exit(1);
  }

  const measured = analyzeWaveform(decoded.samples, decoded.sampleRate);
  const draft = buildReferenceProfile(measured, {
    artist: args.artist,
    title: args.title,
    sourceUrl: args.source,
  });
  const json = JSON.stringify(draft, null, 2);

  if (args.out) {
    writeFileSync(args.out, json);
    console.error(`Wrote profile draft to ${args.out}`);
  } else {
    console.log(json);
  }
}

main();
```

- [ ] **Step 3: Write the docs note**

Create `scripts/README.md`:

```markdown
# Developer scripts

## analyze-reference

Offline reference profile analyzer (PR-15). Turns a WAV file you own into a
**draft** style profile for review before hand-adding to
`src/lib/styleReferences.ts`.

```bash
npm run analyze:reference -- path/to/loop.wav
npm run analyze:reference -- loop.wav --out profile.json --artist "X" --title "Y" --source "https://..."
```

Output is a JSON draft with `bpm`, optional `feelBpm`, a `swing` label
(defaults to `straight` — adjust by ear), a plain-English `profile` note, and a
`measured` block of raw numbers (detected tempo, confidence, onset density).

### Important

- **Audio files are never committed.** Scratch inputs go in `reference-audio/`
  (git-ignored). Generated `*.profile.json` files are git-ignored too.
- Generated profiles are **educational metadata only** — review and edit them,
  then copy the clean `bpm` / `feelBpm` / `swing` / `profile` fields into
  `STYLE_REFERENCES` by hand. The tool never writes into the app.
- WAV only. Convert other formats first: `ffmpeg -i in.mp3 out.wav`.
```

- [ ] **Step 4: Update .gitignore**

Add these lines to `.gitignore`:
```
# PR-15 reference analyzer: never commit audio or generated profiles
reference-audio/
*.wav
*.profile.json
```

- [ ] **Step 5: Manual verification run**

Generate a synthetic WAV and run the tool end-to-end (no real audio needed):

```bash
node -e '
const fs=require("fs");
const sr=22050, dur=8, stride=Math.round(0.5*sr); // 120 BPM
const n=sr*dur, data=Buffer.alloc(44+n*2);
data.write("RIFF",0); data.writeUInt32LE(36+n*2,4); data.write("WAVE",8);
data.write("fmt ",12); data.writeUInt32LE(16,16); data.writeUInt16LE(1,20);
data.writeUInt16LE(1,22); data.writeUInt32LE(sr,24); data.writeUInt32LE(sr*2,28);
data.writeUInt16LE(2,32); data.writeUInt16LE(16,34);
data.write("data",36); data.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++){let v=0; if(i%stride<8) v=Math.round((1-(i%stride)/8)*32767); data.writeInt16LE(v,44+i*2);}
fs.writeFileSync("reference-audio-test.wav",data);
'
npm run analyze:reference -- reference-audio-test.wav
rm reference-audio-test.wav
```

Expected: JSON with `"bpm": 120` (±4), a non-empty `profile` note, and a
`measured` block. Confirm no errors.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run` → all tests pass (existing + new wav/analysis/profile).
Run: `npx tsc --noEmit` → clean. Confirm `tsconfig` compiles `scripts/` without error (if `scripts/` is outside `tsconfig` include, the script still runs via tsx; tsc clean for `src/` is the gate).

- [ ] **Step 7: Commit**

```bash
git add scripts/analyze-reference.ts scripts/README.md package.json package-lock.json .gitignore
git commit -m "PR-15 - Add analyze-reference CLI, tsx runner, and docs (#21)"
```

---

## Self-Review

**Spec coverage:**
- WAV decode → Task 1. ✅
- Tempo/density measurement reusing onsetDetection → Task 2. ✅
- Superset draft schema + normalization (feelBpm, swing, density note) + validation → Task 3. ✅
- CLI run UX, tsx script, no-audio `.gitignore`, doc note → Task 4. ✅
- Tests without real songs (synthetic WAV buffers, click-tracks, fixtures) → Tasks 1–3. ✅
- Acceptance criteria (run locally, no copyrighted audio, profile fields present, validation tested) → all mapped. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code; manual-verification step shows the exact buffer-building command. ✅

**Type consistency:** `MeasuredProfile` defined in Task 2 is imported by Task 3 and used in the CLI (Task 4) with matching fields (`detectedBpm`, `tempoConfidence`, `onsetCount`, `onsetDensityPerSec`, `durationSec`). `StyleReferenceProfileDraft` fields match across Task 3 tests, implementation, and CLI usage. `decodeWav` returns `DecodedAudio { samples, sampleRate, durationMs }` consumed correctly in Task 4. ✅

**Note on swing:** The spec described a swing estimate from off-grid deviation; this plan simplifies to always emit `"straight"` for the reviewer to adjust, because the existing onset pipeline does not expose a reliable per-onset grid-deviation signal without additional work, and the output is explicitly a human-reviewed draft. This is a deliberate YAGNI narrowing — flagged here for the spec reviewer.
