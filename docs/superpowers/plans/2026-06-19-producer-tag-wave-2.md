# Producer Tag — Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set / record / drop-into-beat a producer tag, and export the finished beat (with the tag mixed in) as a downloadable WAV.

**Architecture:** A recorded tag is decoded once at the React edge (browser-only `decodeAudioData`) into plain `{samples, sampleRate}` PCM. Everything downstream — live playback through the engine master, loop scheduling, offline render, mix, and WAV encode — operates on that PCM and is pure/node-testable. The engine gains `setProducerTagSample` and a `loop` placement trigger, mirroring Wave 1's pull-based, three-engine + shared-contract pattern. WAV export composes the existing drum renderer with new pure mix + encode helpers.

**Tech Stack:** Vite + React 19 + TS, native Web Audio + Tone.js, Vitest (node env; components via `renderToStaticMarkup`).

## Global Constraints

- Tests run in the **`node`** Vitest env — no jsdom/DOM/rAF/canvas/real audio/timers. Components tested with `renderToStaticMarkup` (`react-dom/server`).
- The `AudioEngine` interface (`src/audio/audioEngine.ts`) is implemented by THREE engines that all pass `runAudioEngineContract`: `webAudioBeatEngine.ts`, `toneSampleBeatEngine.ts`, `fakeAudioEngine.ts`. Any new interface method MUST be added to all three and the contract extended.
- `npm run hygiene`: 300-line file limit (350 for tests). Keep new files focused.
- `decodeAudioData` (mic Blob → PCM) and Blob/object-URL download are **browser-only glue** — keep thin, do not unit-test; push logic into pure helpers.
- Producer-tag config stays **serializable** — it carries `source`/`trigger`, never audio bytes.
- `STEPS_PER_LOOP = 16`. Drum offline render sample rate is `RENDER_SAMPLE_RATE = 22050` (`styleRender.ts`).
- Verify each task with `npm test`; full gate before final commit: `npm run check`.

## File Structure

- `src/lib/producerTag.ts` — **modify**: add `source` + `"loop"` trigger (Task 1).
- `src/lib/producerTag.test.ts` — **modify**: cover new fields (Task 1).
- `src/lib/wav.ts` — **modify**: add `encodeWav` (Task 2).
- `src/lib/wav.test.ts` — **modify**: encode round-trip (Task 2).
- `src/lib/tagMix.ts` — **create**: `mixSampleIntoPcm` + `tagOffsetsForTrigger` (Task 3).
- `src/lib/tagMix.test.ts` — **create** (Task 3).
- `src/lib/exportBeat.ts` — **create**: `renderBeatWav` (Task 4).
- `src/lib/exportBeat.test.ts` — **create** (Task 4).
- `src/audio/audioEngine.ts` — **modify**: interface `setProducerTagSample` + `ProducerTagSample` type (Tasks 5, 6).
- `src/audio/webAudioBeatEngine.ts`, `toneSampleBeatEngine.ts`, `fakeAudioEngine.ts` — **modify** (Tasks 5, 6).
- `src/audio/engineContract.ts` + `engineContract.test.ts` — **modify** (Tasks 5, 6).
- `src/lib/producerTagSample.ts` — **create**: browser decode glue `decodeProducerTagSample` (Task 7).
- `src/components/ProducerTagControls.tsx` (+ `.test.tsx` create) — **modify/create** (Task 7).
- `src/components/ArrangementPanel.tsx` — **modify**: Download WAV (Task 7).
- `src/App.tsx`, `src/styles.css` — **modify** (Task 7).

---

## Task 1: producerTag domain — `source` + `loop` trigger

**Files:** Modify `src/lib/producerTag.ts`, `src/lib/producerTag.test.ts`.

**Interfaces:**
- Produces: `ProducerTagTrigger = "manual" | "intro" | "loop"`; `ProducerTagConfig` gains `source: ProducerTagSource` where `ProducerTagSource = "text" | "recorded"`; `normalizeProducerTagConfig` accepts/defaults `source` (`"text"`) and the new trigger.

- [ ] **Step 1: Write failing tests** — append to `src/lib/producerTag.test.ts`:

```ts
import { normalizeProducerTagConfig } from "./producerTag";

describe("producer tag source + loop trigger", () => {
  it("defaults source to text", () => {
    expect(normalizeProducerTagConfig({}).source).toBe("text");
  });

  it("accepts recorded source and loop trigger", () => {
    const config = normalizeProducerTagConfig({ source: "recorded", trigger: "loop" });
    expect(config.source).toBe("recorded");
    expect(config.trigger).toBe("loop");
  });

  it("falls back to text for an unknown source", () => {
    // @ts-expect-error exercising runtime guard
    expect(normalizeProducerTagConfig({ source: "bogus" }).source).toBe("text");
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/producerTag.test.ts` → FAIL (`source` undefined / type errors).

- [ ] **Step 3: Implement** in `src/lib/producerTag.ts`:
  - Change the trigger type: `export type ProducerTagTrigger = "manual" | "intro" | "loop";`
  - Add: `export type ProducerTagSource = "text" | "recorded";`
  - Add `source: ProducerTagSource;` to `ProducerTagConfig`, and `source?: ProducerTagSource;` to `ProducerTagConfigInput`.
  - In `normalizeProducerTagConfig`, add `source: input.source === "recorded" ? "recorded" : "text",`.
  - Where `trigger` is normalized, accept `"loop"`: `trigger: input.trigger === "intro" || input.trigger === "loop" ? input.trigger : "manual",` (replace the existing `?? "manual"` logic accordingly).

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/producerTag.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/producerTag.ts src/lib/producerTag.test.ts && git commit -m "feat(PR-25): producer tag source + loop trigger in domain"`

---

## Task 2: `encodeWav` (pure)

**Files:** Modify `src/lib/wav.ts`, `src/lib/wav.test.ts`.

**Interfaces:**
- Consumes: existing `decodeWav` (for round-trip).
- Produces: `encodeWav(samples: Float32Array, sampleRate: number): Uint8Array` — 16-bit PCM mono RIFF/WAVE.

- [ ] **Step 1: Write failing test** — append to `src/lib/wav.test.ts`:

```ts
import { decodeWav, encodeWav } from "./wav";

describe("encodeWav", () => {
  it("produces a RIFF/WAVE buffer that decodeWav reads back", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const bytes = encodeWav(samples, 22050);
    const decoded = decodeWav(bytes);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.samples).toHaveLength(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      // 16-bit quantization tolerance.
      expect(Math.abs(decoded.samples[i] - samples[i])).toBeLessThan(0.001);
    }
  });

  it("clamps out-of-range samples to [-1, 1]", () => {
    const bytes = encodeWav(new Float32Array([2, -2]), 8000);
    const decoded = decodeWav(bytes);
    expect(decoded.samples[0]).toBeCloseTo(1, 2);
    expect(decoded.samples[1]).toBeCloseTo(-1, 2);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/wav.test.ts` → FAIL (`encodeWav` undefined).

- [ ] **Step 3: Implement** — append to `src/lib/wav.ts`:

```ts
/**
 * Encode mono PCM samples (−1..1) as a 16-bit RIFF/WAVE buffer. Round-trips
 * with `decodeWav`. Samples are clamped to [-1, 1] before quantization.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(view, 36, "data");
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * bytesPerSample, Math.round(clamped * 32767), true);
  }

  return new Uint8Array(buffer);
}

function writeStr(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/wav.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/wav.ts src/lib/wav.test.ts && git commit -m "feat(PR-26): encodeWav 16-bit PCM encoder"`

---

## Task 3: `tagMix` helpers (pure)

**Files:** Create `src/lib/tagMix.ts`, `src/lib/tagMix.test.ts`.

**Interfaces:**
- Produces:
  - `mixSampleIntoPcm(dest: Float32Array, sample: Float32Array, offsetSamples: number): void` — additive, in place, bounds-clamped (writes only where `0 <= offset+i < dest.length`; negative offsets skip the leading part).
  - `tagOffsetsForTrigger(trigger: "manual" | "intro" | "loop", loops: number, loopSamples: number): number[]` — `manual → []`, `intro → [0]`, `loop → [0, loopSamples, …, (loops-1)·loopSamples]`.

- [ ] **Step 1: Write failing test** — create `src/lib/tagMix.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mixSampleIntoPcm, tagOffsetsForTrigger } from "./tagMix";

describe("mixSampleIntoPcm", () => {
  it("adds the sample at the offset", () => {
    const dest = new Float32Array([0, 0, 0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1]), 1);
    expect(Array.from(dest)).toEqual([0, 1, 1, 0]);
  });

  it("is additive, not overwrite", () => {
    const dest = new Float32Array([0.5, 0.5]);
    mixSampleIntoPcm(dest, new Float32Array([0.25, 0.25]), 0);
    expect(dest[0]).toBeCloseTo(0.75);
  });

  it("clamps writes past the end", () => {
    const dest = new Float32Array([0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1, 1]), 1);
    expect(Array.from(dest)).toEqual([0, 1]);
  });

  it("skips the negative leading part of the offset", () => {
    const dest = new Float32Array([0, 0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1, 1]), -1);
    expect(Array.from(dest)).toEqual([1, 1, 0]);
  });
});

describe("tagOffsetsForTrigger", () => {
  it("manual places nothing", () => {
    expect(tagOffsetsForTrigger("manual", 4, 1000)).toEqual([]);
  });
  it("intro places once at the start", () => {
    expect(tagOffsetsForTrigger("intro", 4, 1000)).toEqual([0]);
  });
  it("loop places once per loop", () => {
    expect(tagOffsetsForTrigger("loop", 3, 1000)).toEqual([0, 1000, 2000]);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/tagMix.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/lib/tagMix.ts`:

```ts
import type { ProducerTagTrigger } from "./producerTag";

/** Add `sample` into `dest` starting at `offsetSamples`, clamped to bounds. */
export function mixSampleIntoPcm(
  dest: Float32Array,
  sample: Float32Array,
  offsetSamples: number,
): void {
  for (let i = 0; i < sample.length; i += 1) {
    const pos = offsetSamples + i;
    if (pos < 0 || pos >= dest.length) {
      continue;
    }
    dest[pos] += sample[i];
  }
}

/** Sample offsets where the tag is placed, given the trigger and loop layout. */
export function tagOffsetsForTrigger(
  trigger: ProducerTagTrigger,
  loops: number,
  loopSamples: number,
): number[] {
  if (trigger === "intro") {
    return [0];
  }
  if (trigger === "loop") {
    return Array.from({ length: Math.max(0, loops) }, (_, i) => i * loopSamples);
  }
  return [];
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/tagMix.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/tagMix.ts src/lib/tagMix.test.ts && git commit -m "feat(PR-26): pure tag mix + placement-offset helpers"`

---

## Task 4: `renderBeatWav` export composition (pure)

**Files:** Create `src/lib/exportBeat.ts`, `src/lib/exportBeat.test.ts`.

**Interfaces:**
- Consumes: `renderPatternToPcm` + `RENDER_SAMPLE_RATE` + `DecodedKit` (`styleRender.ts`); `encodeWav` (Task 2); `mixSampleIntoPcm` + `tagOffsetsForTrigger` (Task 3); `BeatStyle`; `Pattern`; `ProducerTagTrigger`.
- Produces: `renderBeatWav(input: RenderBeatWavInput): Uint8Array` and `interface RenderBeatWavInput { pattern: Pattern; style: BeatStyle; kit: DecodedKit; loops?: number; tag?: { samples: Float32Array; trigger: ProducerTagTrigger } }`.

Behavior: render one bar of drums via `renderPatternToPcm`, tile it `loops` (default 2) times into one buffer, then — if `tag` present — resample-free mix the tag PCM (assumed already at `RENDER_SAMPLE_RATE`; the decode glue in Task 7 decodes at this rate) at each `tagOffsetsForTrigger` offset, and `encodeWav` the result.

- [ ] **Step 1: Write failing test** — create `src/lib/exportBeat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import { loadKitFromDisk } from "./loadKit.node";
import { decodeWav } from "./wav";
import { renderBeatWav } from "./exportBeat";

describe("renderBeatWav", () => {
  const kit = loadKitFromDisk();

  it("encodes a valid WAV whose length scales with loops", () => {
    const one = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 1 }));
    const two = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2 }));
    expect(one.sampleRate).toBe(22050);
    expect(two.samples.length).toBeGreaterThan(one.samples.length);
  });

  it("mixes a recorded tag in so the output is not identical to drums-only", () => {
    const drumsOnly = decodeWav(renderBeatWav({ pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2 }));
    const tag = new Float32Array(2205).fill(0.3); // ~0.1s tone
    const withTag = decodeWav(renderBeatWav({
      pattern: BEAT_STYLES.trap.pattern, style: BEAT_STYLES.trap, kit, loops: 2,
      tag: { samples: tag, trigger: "intro" },
    }));
    let differs = false;
    for (let i = 0; i < Math.min(2205, drumsOnly.samples.length); i += 1) {
      if (Math.abs(withTag.samples[i] - drumsOnly.samples[i]) > 1e-4) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/exportBeat.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/lib/exportBeat.ts`:

```ts
import type { BeatStyle } from "./beatStyles";
import type { Pattern } from "./patterns";
import type { ProducerTagTrigger } from "./producerTag";
import { RENDER_SAMPLE_RATE, renderPatternToPcm, type DecodedKit } from "./styleRender";
import { mixSampleIntoPcm, tagOffsetsForTrigger } from "./tagMix";
import { encodeWav } from "./wav";

export interface RenderBeatWavInput {
  pattern: Pattern;
  style: BeatStyle;
  kit: DecodedKit;
  loops?: number;
  tag?: { samples: Float32Array; trigger: ProducerTagTrigger };
}

/** Render drums for `loops` bars, mix in the recorded tag, encode to WAV bytes. */
export function renderBeatWav(input: RenderBeatWavInput): Uint8Array {
  const loops = Math.max(1, Math.floor(input.loops ?? 2));
  const bar = renderPatternToPcm(input.pattern, input.style, input.kit);
  // One bar's worth of samples (drop the renderer's decay tail when tiling so
  // loops butt up cleanly); use the 16th-grid bar length.
  const loopSamples = Math.round((60 / input.style.bpm / 4) * 16 * RENDER_SAMPLE_RATE);
  const out = new Float32Array(loopSamples * loops + (bar.length - loopSamples));

  for (let loop = 0; loop < loops; loop += 1) {
    mixSampleIntoPcm(out, bar, loop * loopSamples);
  }

  if (input.tag) {
    for (const offset of tagOffsetsForTrigger(input.tag.trigger, loops, loopSamples)) {
      mixSampleIntoPcm(out, input.tag.samples, offset);
    }
  }

  return encodeWav(out, RENDER_SAMPLE_RATE);
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/exportBeat.test.ts` → PASS. (If hygiene/typecheck complains about an unused import, remove it.)

- [ ] **Step 5: Commit** — `git add src/lib/exportBeat.ts src/lib/exportBeat.test.ts && git commit -m "feat(PR-26): renderBeatWav offline export composition"`

---

## Task 5: Engine `setProducerTagSample` + recorded-tag playback

**Files:** Modify `src/audio/audioEngine.ts`, the three engines, `engineContract.ts`, `engineContract.test.ts`.

**Interfaces:**
- Produces on `AudioEngine`:
  - `interface ProducerTagSample { samples: Float32Array; sampleRate: number }`
  - `setProducerTagSample(sample: ProducerTagSample | null): void`
- Behavior: when a sample is set AND the played config `source === "recorded"`, `playProducerTag` plays the sample through `master` (web-audio: `context.createBuffer(1, n, sampleRate)` + `copyToChannel`/manual fill → `AudioBufferSourceNode` → master; tone: equivalent buffer through its output; fake: increments tag-play count and records that a sample is set). Otherwise the existing TTS/fallback path runs. `null` clears the stored sample.

- [ ] **Step 1: Add contract assertion (failing)** — in `engineContract.ts`, inside the `describe`:

```ts
    it("accepts and clears a producer tag sample without throwing", () => {
      const { engine } = makeHarness();
      engine.setProducerTagSample({ samples: new Float32Array([0.1, 0.2]), sampleRate: 22050 });
      engine.playProducerTag({ source: "recorded", trigger: "manual" });
      engine.setProducerTagSample(null);
    });
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/audio/engineContract.test.ts` → FAIL (`setProducerTagSample` not a function).

- [ ] **Step 3: Extend interface** — `audioEngine.ts`: add the `ProducerTagSample` interface (exported) and `setProducerTagSample(sample: ProducerTagSample | null): void;` to `AudioEngine`.

- [ ] **Step 4: Web Audio** — `webAudioBeatEngine.ts`: store `let tagSample: ProducerTagSample | null = null;`. Add `setProducerTagSample(s) { tagSample = s; }`. Add a `playTagSample(time)` that builds an `AudioBuffer` from `tagSample` (guard `context.createBuffer`), fills channel 0 from `samples`, routes a buffer source through `master`, starts at `time`. In `playProducerTag`, when `config.source === "recorded" && tagSample`, call `playTagSample(context.currentTime)` and return; else existing path. Add `setProducerTagSample` + (later) keep tag for loop use to the returned object.

- [ ] **Step 5: Tone + fake** — `toneSampleBeatEngine.ts`: store the sample; in `playProducerTag`, when `source === "recorded"` and a sample is set, play it via a Tone buffer/player through the output (fallback to existing voice if unavailable); add `setProducerTagSample` to the returned object. `fakeAudioEngine.ts`: store the sample, count a tag play in `playProducerTag` (it already records `producerTags`), expose `setProducerTagSample` (and optionally `producerTagSampleSet` for tests), clear on `null`.

- [ ] **Step 6: Teach fake AudioContexts `createBuffer` channel fill** — confirm `WebAudioFakeContext.createBuffer` (in `engineContract.test.ts` and `webAudioBeatEngine.test.ts`) returns an object with `getChannelData()` (it already does) and add `copyToChannel?` no-op if the implementation uses it. Use `getChannelData()` fill in the engine to avoid needing `copyToChannel`.

- [ ] **Step 7: Add a web-audio specific assertion** — `webAudioBeatEngine.test.ts`: after `setProducerTagSample({samples,sampleRate})` + `playProducerTag({source:"recorded",trigger:"manual"})`, assert a buffer source `start` was recorded (reuse `bufferSourceStarts`).

- [ ] **Step 8: Run** — `npm test -- src/audio` → PASS.

- [ ] **Step 9: Commit** — `git add src/audio && git commit -m "feat(PR-25): play a recorded producer tag sample through the engine master"`

---

## Task 6: Engine every-loop trigger scheduling

**Files:** Modify the three engines + `engineContract.ts`.

**Interfaces:**
- Consumes: Task 5's `tagSample` + recorded playback path; `ProducerTagConfig.trigger === "loop"`.
- Behavior: the engine fires the recorded tag at each loop boundary (step index 0) while playing, when the active producer-tag config has `trigger === "loop"` and `source === "recorded"` and a sample is set. The config is supplied via the existing `start`/`playProducerTag` surface — add `setProducerTagConfig(config)` OR pass the trigger through `start`. SIMPLEST: add `setProducerTagConfig(config: ProducerTagConfigInput | null): void` to the interface; the engine stores it and, in the web-audio scheduler loop where `step === 0` is detected, fires `playTagSample(nextStepTime)` when the stored config says loop+recorded. Tone mirrors in its `scheduleRepeat` callback at `stepIndex === 0`. Fake records a tag play per loop tick when configured.

- [ ] **Step 1: Contract assertion (failing)** — in `engineContract.ts`:

```ts
    it("accepts a producer tag config for loop placement without throwing", () => {
      const { engine } = makeHarness();
      engine.setProducerTagConfig({ source: "recorded", trigger: "loop" });
      engine.setProducerTagConfig(null);
    });
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/audio/engineContract.test.ts` → FAIL.

- [ ] **Step 3: Interface** — add `setProducerTagConfig(config: ProducerTagConfigInput | null): void;` to `AudioEngine`.

- [ ] **Step 4: Web Audio** — store `let tagConfig` ; in the scheduler `while` loop, when `step === 0` and `tagConfig?.trigger === "loop" && tagConfig.source === "recorded" && tagSample`, call `playTagSample(nextStepTime)`. Reset nothing on stop beyond existing. Add `setProducerTagConfig` to the returned object.

- [ ] **Step 5: Tone + fake** — Tone: in the `scheduleRepeat` callback, when `stepIndex === 0` and config is loop+recorded and a sample is set, play the tag buffer at `time`. Fake: store config; in a way the contract can observe (e.g., increment a counter on a fired loop tick) — minimally, just store and expose; the loop-fire behavior is asserted in the web-audio specific test.

- [ ] **Step 6: Web-audio specific test** — `webAudioBeatEngine.test.ts`: with a sample set + `setProducerTagConfig({source:"recorded",trigger:"loop"})`, `start(trap)` + `runTimer(1)` schedules ≥1 loop and asserts an extra buffer-source start occurred at the loop boundary (count buffer starts before/after, or assert the tag sample's buffer length appears). Keep the assertion concrete but robust.

- [ ] **Step 7: Run** — `npm test -- src/audio` → PASS.

- [ ] **Step 8: Commit** — `git add src/audio && git commit -m "feat(PR-26): schedule recorded producer tag every loop"`

---

## Task 7: UI + wiring (record / source / Download WAV)

**Files:** Create `src/lib/producerTagSample.ts`; modify `ProducerTagControls.tsx` (+ create `.test.tsx`), `ArrangementPanel.tsx`, `App.tsx`, `styles.css`.

**Interfaces:**
- Consumes everything above: `captureMicrophoneSample`, `decodeProducerTagSample`, `engine.setProducerTagSample`/`setProducerTagConfig`, `renderBeatWav`.
- Produces: `decodeProducerTagSample(blob: Blob, runtime?): Promise<{ samples: Float32Array; sampleRate: number }>` (browser glue, not unit-tested) — decodes via an `AudioContext`, downmixes to mono, **resamples to `RENDER_SAMPLE_RATE`** (nearest-sample is acceptable) so the live engine and the offline export agree; `ProducerTagControls` gains record/source/clear; `ArrangementPanel` gains Download WAV.

- [ ] **Step 1: Failing component test** — create `src/components/ProducerTagControls.test.tsx` using `renderToStaticMarkup`, asserting the control renders a record action and a source toggle and the trigger select contains a "Loop" option. (Pattern from `StyleFidelityMeter.test.tsx`; pass the new props.)

- [ ] **Step 2: Run to verify fail** — `npm test -- src/components/ProducerTagControls.test.tsx` → FAIL.

- [ ] **Step 3: Implement glue** — create `src/lib/producerTagSample.ts` with `decodeProducerTagSample` (browser-only; `new AudioContext()`, `decodeAudioData`, downmix channel 0, nearest-sample resample to `RENDER_SAMPLE_RATE`, return `{samples, sampleRate: RENDER_SAMPLE_RATE}`).

- [ ] **Step 4: Implement UI** — `ProducerTagControls.tsx`: add props `source`, `onSourceChange`, `recordedState` ("none"|"recording"|"recorded"), `onRecord`, `onClearRecording`, and a `"loop"` `<option>` in the trigger select; render a source toggle (Type/Record), a Record/Re-record/Clear button reflecting `recordedState`. Keep rate/pitch for the text path.

- [ ] **Step 5: Wire App** — `App.tsx`: state for `producerTagSource`, recorded PCM, `recordedState`. `recordTag()` → `captureMicrophoneSample({durationMs: 3000})` → `decodeProducerTagSample(result.blob)` → store PCM + `engine.setProducerTagSample(pcm)`; reflect errors via the existing mic error surface. On config change, call `engine.setProducerTagConfig(producerTagConfig)`. Thread `source` into `normalizeProducerTagConfig` and the exported project JSON (already serialized via `createBeatLabProject`).

- [ ] **Step 6: Download WAV** — `ArrangementPanel.tsx` + `App.tsx`: add `onDownloadWav` that builds `renderBeatWav({pattern, style, kit, loops: 2, tag: source==="recorded" && pcm ? {samples: pcm.samples, trigger} : undefined})`, wraps the `Uint8Array` in a `Blob({type:"audio/wav"})`, creates an object URL, and clicks a temporary `<a download>`; replace the `createUnsupportedWavExportResult` messaging with the real action. (`kit` is already loaded in `App` for the fidelity meter.)

- [ ] **Step 7: Styles** — add minimal styles for the record control + source toggle in `styles.css`.

- [ ] **Step 8: Full gate** — `npm run check` → green (hygiene, tsc, all tests).

- [ ] **Step 9: Commit** — `git add -A && git commit -m "feat(PR-25/26): record + set tag, loop placement, Download WAV export"`

---

## Self-Review

**Spec coverage:**
- PR-25 set+record: Task 1 (source), Task 5 (engine playback), Task 7 (record UI + decode glue). ✓
- PR-26 in-beat: Task 1 (loop trigger), Task 6 (loop scheduling), Task 3 (offsets). ✓
- PR-26 export: Task 2 (encodeWav), Task 3 (mix), Task 4 (renderBeatWav), Task 7 (Download WAV + JSON source/trigger). ✓
- Decode boundary kept browser-only (Task 7 glue); all mix/encode/render pure and node-tested. ✓
- Three-engine contract extended for both new methods (Tasks 5, 6). ✓

**Placeholder scan:** Tasks 1–4 carry complete code. Tasks 5–7 give exact interfaces, file anchors, and test intent; the implementer writes the engine/UI bodies against the existing patterns (Wave 1 added analogous seams). No "TBD"/"add error handling" hand-waving.

**Type consistency:** `ProducerTagSample {samples, sampleRate}` is the single PCM shape across engine, decode glue, and export. `ProducerTagTrigger` (now incl. `"loop"`) and `ProducerTagSource` from Task 1 are consumed by Tasks 3/4/5/6/7. `renderBeatWav` consumes `encodeWav` (Task 2) + `mixSampleIntoPcm`/`tagOffsetsForTrigger` (Task 3).

**Note for executor:** Tasks 5–7 are integration-heavy and prose-specified (not full code) — dispatch them to a standard model (sonnet), not the cheapest tier, and lean on the per-task reviewer. Tasks 1–4 are complete-code transcription (cheap tier OK).
