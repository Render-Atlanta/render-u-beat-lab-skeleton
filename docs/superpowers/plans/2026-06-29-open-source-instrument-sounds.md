# Open-Source Instrument Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add license-clean, open-source sampled instrument voices (real piano/Rhodes/strings on the melody lane, electric/upright bass on the bass lane, and an acoustic drum kit) selectable per lane, playing in live playback only.

**Architecture:** Realistic melodic voices are a new `laneVoices` selection layered onto the existing pitched-lane path — the Tone.js engine swaps a `Tone.Sampler` in for the synth voice (synth stays the default and the fallback). The realistic drum kit reuses the existing `sampleKitId` system by adding an `"acoustic"` kit. Samples are sparse per-note WAVs served from `/public`, lazy-loaded only when a non-synth voice is selected. The pure-PCM WAV exporter (`styleRender.ts`) is intentionally left unchanged — export parity is a separate follow-up PR.

**Tech Stack:** React 19 + TypeScript + Vite, Tone.js v15 (`Tone.Sampler`), Vitest. Samples sourced from VCSL (CC0).

## Global Constraints

- **Synth stays the default** for every lane; no change to any lane's default sound.
- **Live playback only** in this plan; `src/lib/styleRender.ts` and `src/lib/exportBeat.ts` must NOT change. Exported WAV output stays byte-identical for synth-default selections — existing export tests must remain green.
- **Lazy-load:** sampled assets load only when a non-synth voice is selected; initial page load must not fetch them.
- **License:** every bundled sample records source `VCSL` + license `CC0` in the manifest; assets live under `public/instruments/` with a `LICENSE.md`.
- **Bundle budget:** each per-note sample file < 60 KB; total added assets documented in the PR.
- **Voiced lanes are `melody` and `bassGuitar` only.** `808` stays synth.
- Verification gate for every commit: `npm run check` (runs hygiene + script typecheck + `vitest run`).
- Follow existing module conventions: selection helpers mirror `src/lib/sampleKitSelection.ts`; manifest mirrors `src/audio/sampleKit.ts`.

---

### Task 1: Lane-voice selection model

Pure types + serialization helpers for which voice each melodic lane uses. No manifest validation here (Task 2 adds that) — this is the self-contained, asset-free foundation. Mirrors `src/lib/sampleKitSelection.ts`.

**Files:**
- Create: `src/lib/laneVoiceSelection.ts`
- Test: `src/lib/laneVoiceSelection.test.ts`

**Interfaces:**
- Produces:
  - `VOICED_LANES: readonly ["melody", "bassGuitar"]`
  - `type VoicedLane = "melody" | "bassGuitar"`
  - `SYNTH_VOICE_ID = "synth"` (the default voice id)
  - `type LaneVoiceId = string`
  - `type LaneVoiceSelection = Record<VoicedLane, LaneVoiceId>`
  - `createDefaultLaneVoiceSelection(): LaneVoiceSelection`
  - `cloneLaneVoiceSelection(s: LaneVoiceSelection): LaneVoiceSelection`
  - `laneVoiceSelectionIsDefault(s: LaneVoiceSelection): boolean`
  - `serializeLaneVoiceSelection(s: LaneVoiceSelection): string`
  - `deserializeLaneVoiceSelection(value: string | null): LaneVoiceSelection | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/laneVoiceSelection.test.ts
import { describe, expect, it } from "vitest";
import {
  VOICED_LANES,
  SYNTH_VOICE_ID,
  createDefaultLaneVoiceSelection,
  cloneLaneVoiceSelection,
  laneVoiceSelectionIsDefault,
  serializeLaneVoiceSelection,
  deserializeLaneVoiceSelection,
} from "./laneVoiceSelection";

describe("lane voice selection", () => {
  it("voiced lanes are melody and bassGuitar", () => {
    expect([...VOICED_LANES]).toEqual(["melody", "bassGuitar"]);
  });

  it("defaults every voiced lane to the synth voice", () => {
    expect(createDefaultLaneVoiceSelection()).toEqual({
      melody: SYNTH_VOICE_ID,
      bassGuitar: SYNTH_VOICE_ID,
    });
    expect(laneVoiceSelectionIsDefault(createDefaultLaneVoiceSelection())).toBe(true);
  });

  it("clone is a deep copy", () => {
    const original = createDefaultLaneVoiceSelection();
    const copy = cloneLaneVoiceSelection(original);
    copy.melody = "piano";
    expect(original.melody).toBe(SYNTH_VOICE_ID);
  });

  it("round-trips a non-default selection", () => {
    const selection = { melody: "piano", bassGuitar: "electric" };
    const encoded = serializeLaneVoiceSelection(selection);
    expect(deserializeLaneVoiceSelection(encoded)).toEqual(selection);
  });

  it("deserialize returns null for malformed input", () => {
    expect(deserializeLaneVoiceSelection("garbage")).toBeNull();
    expect(deserializeLaneVoiceSelection(null)).toBeNull();
  });

  it("deserialize fills missing lanes with the synth default", () => {
    expect(deserializeLaneVoiceSelection("melody~piano")).toEqual({
      melody: "piano",
      bassGuitar: SYNTH_VOICE_ID,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/laneVoiceSelection.test.ts`
Expected: FAIL — `Cannot find module './laneVoiceSelection'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/laneVoiceSelection.ts
export const VOICED_LANES = ["melody", "bassGuitar"] as const;
export type VoicedLane = (typeof VOICED_LANES)[number];

export const SYNTH_VOICE_ID = "synth";
export type LaneVoiceId = string;

export type LaneVoiceSelection = Record<VoicedLane, LaneVoiceId>;

export function createDefaultLaneVoiceSelection(): LaneVoiceSelection {
  return { melody: SYNTH_VOICE_ID, bassGuitar: SYNTH_VOICE_ID };
}

export function cloneLaneVoiceSelection(s: LaneVoiceSelection): LaneVoiceSelection {
  return { melody: s.melody, bassGuitar: s.bassGuitar };
}

export function laneVoiceSelectionIsDefault(s: LaneVoiceSelection): boolean {
  return VOICED_LANES.every((lane) => s[lane] === SYNTH_VOICE_ID);
}

// Encoded as `lane~id` pairs joined by `.`, e.g. "melody~piano.bassGuitar~electric".
export function serializeLaneVoiceSelection(s: LaneVoiceSelection): string {
  return VOICED_LANES.map((lane) => `${lane}~${s[lane]}`).join(".");
}

export function deserializeLaneVoiceSelection(
  value: string | null,
): LaneVoiceSelection | null {
  if (!value) return null;
  const result = createDefaultLaneVoiceSelection();
  let matched = false;
  for (const pair of value.split(".")) {
    const match = /^(melody|bassGuitar)~([A-Za-z0-9_-]+)$/.exec(pair);
    if (!match) return null;
    result[match[1] as VoicedLane] = match[2];
    matched = true;
  }
  return matched ? result : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/laneVoiceSelection.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/laneVoiceSelection.ts src/lib/laneVoiceSelection.test.ts
git commit -m "feat: add lane voice selection model (#122)"
```

---

### Task 2: Instrument-voice manifest + validation

The catalog of available voices per lane, their per-note sample URL maps, and license metadata. Includes `normalizeLaneVoiceSelection` (validates ids against the manifest) and the URL-map resolver the engine consumes. Mirrors `src/audio/sampleKit.ts`.

**Files:**
- Create: `src/lib/instrumentVoices.ts`
- Test: `src/lib/instrumentVoices.test.ts`

**Interfaces:**
- Consumes: `VoicedLane`, `LaneVoiceId`, `LaneVoiceSelection`, `SYNTH_VOICE_ID`, `VOICED_LANES` from Task 1.
- Produces:
  - `type NoteSampleMap = Record<string, string>` (noteName → public URL)
  - `interface InstrumentVoiceOption { id: LaneVoiceId; lane: VoicedLane; name: string; samples: NoteSampleMap | null; source: string; license: string }`
  - `INSTRUMENT_VOICES: readonly InstrumentVoiceOption[]`
  - `getLaneVoiceOptions(lane: VoicedLane): InstrumentVoiceOption[]`
  - `isLaneVoiceId(lane: VoicedLane, id: string): boolean`
  - `normalizeLaneVoiceSelection(s: Partial<LaneVoiceSelection> | null | undefined): LaneVoiceSelection`
  - `getLaneVoiceSamples(lane: VoicedLane, id: LaneVoiceId): NoteSampleMap | null` (null = use synth)
  - `getSelectedLaneVoiceSamples(selection: LaneVoiceSelection): Partial<Record<VoicedLane, NoteSampleMap>>` (only non-synth lanes present)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/instrumentVoices.test.ts
import { describe, expect, it } from "vitest";
import { SYNTH_VOICE_ID, VOICED_LANES } from "./laneVoiceSelection";
import {
  INSTRUMENT_VOICES,
  getLaneVoiceOptions,
  isLaneVoiceId,
  normalizeLaneVoiceSelection,
  getLaneVoiceSamples,
  getSelectedLaneVoiceSamples,
} from "./instrumentVoices";

describe("instrument voice manifest", () => {
  it("offers the synth voice first for every voiced lane", () => {
    for (const lane of VOICED_LANES) {
      const options = getLaneVoiceOptions(lane);
      expect(options.length).toBeGreaterThan(1);
      expect(options[0].id).toBe(SYNTH_VOICE_ID);
    }
  });

  it("the synth voice carries no samples; sampled voices do", () => {
    for (const voice of INSTRUMENT_VOICES) {
      if (voice.id === SYNTH_VOICE_ID) {
        expect(voice.samples).toBeNull();
      } else {
        expect(voice.samples && Object.keys(voice.samples).length).toBeGreaterThan(0);
      }
    }
  });

  it("every sampled voice records a source and license", () => {
    for (const voice of INSTRUMENT_VOICES) {
      if (voice.id === SYNTH_VOICE_ID) continue;
      expect(voice.source).toBeTruthy();
      expect(voice.license).toBe("CC0");
    }
  });

  it("validates voice ids per lane", () => {
    expect(isLaneVoiceId("melody", SYNTH_VOICE_ID)).toBe(true);
    expect(isLaneVoiceId("melody", "definitely-not-a-voice")).toBe(false);
  });

  it("normalize drops unknown ids back to synth", () => {
    expect(
      normalizeLaneVoiceSelection({ melody: "definitely-not-a-voice" }),
    ).toEqual({ melody: SYNTH_VOICE_ID, bassGuitar: SYNTH_VOICE_ID });
  });

  it("getLaneVoiceSamples returns null for synth and a map otherwise", () => {
    expect(getLaneVoiceSamples("melody", SYNTH_VOICE_ID)).toBeNull();
    const firstSampled = getLaneVoiceOptions("melody").find(
      (v) => v.id !== SYNTH_VOICE_ID,
    )!;
    expect(getLaneVoiceSamples("melody", firstSampled.id)).not.toBeNull();
  });

  it("getSelectedLaneVoiceSamples includes only non-synth lanes", () => {
    const firstSampled = getLaneVoiceOptions("melody").find(
      (v) => v.id !== SYNTH_VOICE_ID,
    )!;
    const result = getSelectedLaneVoiceSamples({
      melody: firstSampled.id,
      bassGuitar: SYNTH_VOICE_ID,
    });
    expect(result.melody).toBeDefined();
    expect(result.bassGuitar).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/instrumentVoices.test.ts`
Expected: FAIL — `Cannot find module './instrumentVoices'`.

- [ ] **Step 3: Write minimal implementation**

The URL maps point at files Task 3 places on disk. Use a sparse note set (one sample every 4 semitones) and let `Tone.Sampler` interpolate. Helper `notes(name, list)` builds `/instruments/<name>/<note>.wav` maps.

```ts
// src/lib/instrumentVoices.ts
import {
  SYNTH_VOICE_ID,
  VOICED_LANES,
  type LaneVoiceId,
  type LaneVoiceSelection,
  type VoicedLane,
  createDefaultLaneVoiceSelection,
} from "./laneVoiceSelection";

export type NoteSampleMap = Record<string, string>;

export interface InstrumentVoiceOption {
  id: LaneVoiceId;
  lane: VoicedLane;
  name: string;
  /** null for the built-in synth voice; a noteName -> URL map otherwise. */
  samples: NoteSampleMap | null;
  source: string;
  license: string;
}

// Sparse multisample: one WAV every 4 semitones; Sampler interpolates between.
function notes(dir: string, noteNames: string[]): NoteSampleMap {
  return Object.fromEntries(
    noteNames.map((n) => [n, `/instruments/${dir}/${n.replace("#", "s")}.wav`]),
  );
}

const SYNTH = (lane: VoicedLane): InstrumentVoiceOption => ({
  id: SYNTH_VOICE_ID,
  lane,
  name: "Synth",
  samples: null,
  source: "built-in",
  license: "CC0",
});

const MELODY_RANGE = ["C3", "E3", "G#3", "C4", "E4", "G#4", "C5", "E5"];
const BASS_RANGE = ["C1", "E1", "G#1", "C2", "E2", "G#2", "C3"];

export const INSTRUMENT_VOICES: readonly InstrumentVoiceOption[] = [
  SYNTH("melody"),
  { id: "piano", lane: "melody", name: "Grand Piano", samples: notes("piano", MELODY_RANGE), source: "VCSL", license: "CC0" },
  { id: "rhodes", lane: "melody", name: "Rhodes", samples: notes("rhodes", MELODY_RANGE), source: "VCSL", license: "CC0" },
  { id: "strings", lane: "melody", name: "Strings", samples: notes("strings", MELODY_RANGE), source: "VCSL", license: "CC0" },
  SYNTH("bassGuitar"),
  { id: "electric", lane: "bassGuitar", name: "Electric Bass", samples: notes("electric-bass", BASS_RANGE), source: "VCSL", license: "CC0" },
  { id: "upright", lane: "bassGuitar", name: "Upright Bass", samples: notes("upright-bass", BASS_RANGE), source: "VCSL", license: "CC0" },
];

export function getLaneVoiceOptions(lane: VoicedLane): InstrumentVoiceOption[] {
  return INSTRUMENT_VOICES.filter((v) => v.lane === lane);
}

export function isLaneVoiceId(lane: VoicedLane, id: string): boolean {
  return getLaneVoiceOptions(lane).some((v) => v.id === id);
}

export function normalizeLaneVoiceSelection(
  s: Partial<LaneVoiceSelection> | null | undefined,
): LaneVoiceSelection {
  const result = createDefaultLaneVoiceSelection();
  if (!s) return result;
  for (const lane of VOICED_LANES) {
    const candidate = s[lane];
    if (candidate && isLaneVoiceId(lane, candidate)) result[lane] = candidate;
  }
  return result;
}

export function getLaneVoiceSamples(
  lane: VoicedLane,
  id: LaneVoiceId,
): NoteSampleMap | null {
  return getLaneVoiceOptions(lane).find((v) => v.id === id)?.samples ?? null;
}

export function getSelectedLaneVoiceSamples(
  selection: LaneVoiceSelection,
): Partial<Record<VoicedLane, NoteSampleMap>> {
  const result: Partial<Record<VoicedLane, NoteSampleMap>> = {};
  for (const lane of VOICED_LANES) {
    const samples = getLaneVoiceSamples(lane, selection[lane]);
    if (samples) result[lane] = samples;
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/instrumentVoices.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/instrumentVoices.ts src/lib/instrumentVoices.test.ts
git commit -m "feat: add instrument voice manifest + validation (#122)"
```

---

### Task 3: Acquire & commit VCSL sample assets

Populate `public/instruments/` with the per-note WAVs the manifest references, plus a license file. This task produces real binary assets and an on-disk validation test. It depends on the manifest paths from Task 2.

**Files:**
- Create: `public/instruments/<voice>/<note>.wav` for every sampled voice + note in Task 2's ranges (e.g. `public/instruments/piano/C3.wav`, `.../piano/E3.wav`, … note `#` is written as `s`, so `G#3` → `Gs3.wav`).
- Create: `public/instruments/LICENSE.md`
- Test: `src/lib/instrumentVoices.disk.test.ts`

**Interfaces:**
- Consumes: `INSTRUMENT_VOICES` from Task 2; `decodeWav` from `src/lib/wav.ts`.

- [ ] **Step 1: Acquire the samples**

Download the source instruments from VCSL (Versilian Community Sample Library, CC0): https://github.com/sgossner/VCSL . For each manifest voice, pick the closest VCSL instrument (e.g. piano → "Grand Piano", rhodes → an electric piano, strings → "String Orchestra Sustains", electric-bass / upright-bass → the bass instruments). For each note in the manifest range, export a single mono WAV trimmed to ~1.5 s, downsampled to 22050 Hz, peak-normalized, saved as `public/instruments/<dir>/<note with # as s>.wav`. Keep each file < 60 KB (use ffmpeg, e.g. `ffmpeg -i in.wav -ac 1 -ar 22050 -t 1.5 out.wav`).

- [ ] **Step 2: Write the license file**

```markdown
<!-- public/instruments/LICENSE.md -->
# Instrument samples

All instrument samples in this directory are derived from the Versilian
Community Sample Library (VCSL), released under CC0 1.0 (public domain).

Source: https://github.com/sgossner/VCSL
License: https://creativecommons.org/publicdomain/zero/1.0/

Files were trimmed, downsampled to 22050 Hz mono, and peak-normalized for web use.
```

- [ ] **Step 3: Write the failing on-disk test**

```ts
// src/lib/instrumentVoices.disk.test.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeWav } from "./wav";
import { INSTRUMENT_VOICES } from "./instrumentVoices";

const PUBLIC_DIR = join(import.meta.dirname, "..", "..", "public");
const sampled = INSTRUMENT_VOICES.flatMap((v) =>
  v.samples ? Object.entries(v.samples).map(([note, url]) => ({ id: v.id, note, url })) : [],
);

describe("instrument voice samples on disk", () => {
  it.each(sampled)("$id $note maps to a valid, small WAV", ({ url }) => {
    const path = join(PUBLIC_DIR, url.replace(/^\//, ""));
    expect(existsSync(path), `missing ${url}`).toBe(true);
    const bytes = readFileSync(path);
    const decoded = decodeWav(bytes);
    expect(decoded.samples.length).toBeGreaterThan(0);
    expect(decoded.sampleRate).toBe(22050);
    expect(bytes.byteLength).toBeLessThan(60_000);
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/instrumentVoices.disk.test.ts`
Expected: PASS once all referenced files exist. If it fails listing a missing file, that note still needs exporting in Step 1.

- [ ] **Step 5: Document footprint and commit**

```bash
du -sh public/instruments
git add public/instruments src/lib/instrumentVoices.disk.test.ts
git commit -m "feat: add CC0 VCSL instrument samples (#122)"
```

Record the `du -sh` total in the PR description (bundle budget).

---

### Task 4: Sampler voice in the Tone runtime

Add a `Tone.Sampler`-backed voice to the runtime port and its default implementation. A Sampler is triggered exactly like the synth pitched voices (`triggerAttackRelease(noteName, dur, time, accent)`), so it slots into the existing `playVoice` pitched path unchanged.

**Files:**
- Modify: `src/audio/toneSampleBeatEngine.ts` (add port method to `ToneRuntimePort`)
- Modify: `src/audio/toneRuntime.ts` (implement `createSamplerVoice`)
- Test: `src/audio/toneRuntime.test.ts` (new)

**Interfaces:**
- Consumes: `NoteSampleMap` from Task 2; `LaneVolumePort`, `ToneVoicePort` from `toneSampleBeatEngine.ts`.
- Produces: optional port method
  `createSamplerVoice?(samples: NoteSampleMap, destination?: LaneVolumePort): ToneVoicePort | null` — returns `null` if the Sampler cannot be constructed, so callers fall back to synth without throwing.

- [ ] **Step 1: Add the port method (type only)**

In `src/audio/toneSampleBeatEngine.ts`, add to `ToneRuntimePort` (just below `createSamplePlayer`):

```ts
  /**
   * Create a multisampled, pitched voice from a noteName -> URL map. Returns
   * null if it cannot be constructed so the caller can fall back to a synth.
   */
  createSamplerVoice?(
    samples: Record<string, string>,
    destination?: LaneVolumePort,
  ): ToneVoicePort | null;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/audio/toneRuntime.test.ts
import { describe, expect, it } from "vitest";
import { getDefaultToneRuntime } from "./toneRuntime";

describe("default tone runtime sampler voice", () => {
  it("exposes createSamplerVoice", () => {
    const runtime = getDefaultToneRuntime();
    expect(typeof runtime.createSamplerVoice).toBe("function");
  });

  it("returns a voice with triggerAttackRelease for a valid map", () => {
    const runtime = getDefaultToneRuntime();
    const voice = runtime.createSamplerVoice?.({ C3: "/instruments/piano/C3.wav" });
    expect(voice).not.toBeNull();
    expect(typeof voice?.triggerAttackRelease).toBe("function");
    voice?.dispose?.();
  });

  it("returns null for an empty sample map", () => {
    const runtime = getDefaultToneRuntime();
    expect(runtime.createSamplerVoice?.({})).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/audio/toneRuntime.test.ts`
Expected: FAIL — `createSamplerVoice` is not a function.

- [ ] **Step 4: Implement createSamplerVoice**

In `src/audio/toneRuntime.ts`, add this property inside the object returned by `getDefaultToneRuntime` (next to `createSamplePlayer`):

```ts
    createSamplerVoice: (samples, destination) =>
      createSamplerVoice(samples, destination),
```

And add this function near `createSamplePlayer`:

```ts
function createSamplerVoice(
  samples: Record<string, string>,
  destination?: LaneVolumePort,
): ToneVoicePort | null {
  if (!samples || Object.keys(samples).length === 0) return null;
  try {
    const sampler = new Tone.Sampler({ urls: samples });
    if (destination) sampler.connect(destination.node);
    else sampler.toDestination();
    return {
      triggerAttackRelease: (...args) => {
        (sampler.triggerAttackRelease as (...a: unknown[]) => unknown)(...args);
      },
      dispose: () => sampler.dispose(),
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/audio/toneRuntime.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/audio/toneSampleBeatEngine.ts src/audio/toneRuntime.ts src/audio/toneRuntime.test.ts
git commit -m "feat: add Tone.Sampler voice to runtime (#122)"
```

---

### Task 5: Route selected sampler voices through the engine

Thread per-lane sample maps into `createToneVoices` so the `melody`/`bassGuitar` lanes use a Sampler when a non-synth voice is selected, falling back to the synth voice on load failure. Drum lanes are untouched.

**Files:**
- Modify: `src/audio/toneVoices.ts`
- Modify: `src/audio/toneSampleBeatEngine.ts` (add `laneVoiceSamples` to options, pass through)
- Test: `src/audio/toneVoices.test.ts` (new)

**Interfaces:**
- Consumes: `createSamplerVoice` from Task 4; `NoteSampleMap` from Task 2.
- Produces:
  - `createToneVoices(runtime, sampleUrls, destination?, laneVoiceSamples?)` — new optional 4th arg `laneVoiceSamples?: Partial<Record<InstrumentId, Record<string, string>>>`.
  - `ToneSampleBeatEngineOptions.laneVoiceSamples?: Partial<Record<InstrumentId, Record<string, string>>>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/toneVoices.test.ts
import { describe, expect, it, vi } from "vitest";
import { createToneVoices } from "./toneVoices";
import type { ToneRuntimePort, ToneVoicePort } from "./toneSampleBeatEngine";

function stubVoice(): ToneVoicePort {
  return { triggerAttackRelease: vi.fn(), start: vi.fn(), dispose: vi.fn() };
}

function stubRuntime(overrides: Partial<ToneRuntimePort> = {}): ToneRuntimePort {
  return {
    start: vi.fn(), loaded: vi.fn(), getTransport: vi.fn() as never,
    createKickSynth: () => stubVoice(),
    createBassSynth: () => stubVoice(),
    createBassGuitarSynth: () => stubVoice(),
    createMelodySynth: () => stubVoice(),
    createNoiseSynth: () => stubVoice(),
    createLaneVolume: () => ({ node: {} as never, setLinearVolume: vi.fn(), dispose: vi.fn() }),
    ...overrides,
  };
}

describe("createToneVoices lane voice routing", () => {
  it("uses createSamplerVoice for a melody lane with a sample map", () => {
    const createSamplerVoice = vi.fn(() => stubVoice());
    const runtime = stubRuntime({ createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {
      melody: { C3: "/instruments/piano/C3.wav" },
    });
    expect(createSamplerVoice).toHaveBeenCalledTimes(1);
  });

  it("falls back to the melody synth when no sample map is given", () => {
    const createMelodySynth = vi.fn(() => stubVoice());
    const createSamplerVoice = vi.fn(() => stubVoice());
    const runtime = stubRuntime({ createMelodySynth, createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {});
    expect(createSamplerVoice).not.toHaveBeenCalled();
    expect(createMelodySynth).toHaveBeenCalled();
  });

  it("falls back to synth when the sampler cannot be built", () => {
    const createMelodySynth = vi.fn(() => stubVoice());
    const createSamplerVoice = vi.fn(() => null);
    const runtime = stubRuntime({ createMelodySynth, createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {
      melody: { C3: "/instruments/piano/C3.wav" },
    });
    expect(createMelodySynth).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/audio/toneVoices.test.ts`
Expected: FAIL — `createToneVoices` ignores the 4th argument / sampler not called.

- [ ] **Step 3: Implement the routing**

In `src/audio/toneVoices.ts`, extend `createToneVoices` to accept and forward the maps:

```ts
export function createToneVoices(
  runtime: ToneRuntimePort,
  sampleUrls: ToneSampleUrls,
  destination?: ToneEffectsBusPort["input"],
  laneVoiceSamples: Partial<Record<InstrumentId, Record<string, string>>> = {},
): ToneVoiceBundle {
  const laneVolumes = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, createLaneVolume(runtime, destination)]),
  ) as Record<InstrumentId, LaneVolumePort>;

  const voices = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [
      id,
      createVoice(runtime, id, sampleUrls[id], laneVolumes[id], laneVoiceSamples[id]),
    ]),
  ) as Record<InstrumentId, ToneVoicePort>;
  // ...unchanged return block...
```

Update `createVoice` to prefer a sampler for pitched melodic lanes:

```ts
function createVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  sampleUrl: string | undefined,
  destination: LaneVolumePort,
  voiceSamples?: Record<string, string>,
): ToneVoicePort {
  if (
    (instrument === "melody" || instrument === "bassGuitar") &&
    voiceSamples &&
    runtime.createSamplerVoice
  ) {
    const sampler = runtime.createSamplerVoice(voiceSamples, destination);
    if (sampler) return sampler;
  }

  if (
    instrument === "808" ||
    instrument === "bassGuitar" ||
    instrument === "melody"
  ) {
    return createSynthVoice(runtime, instrument, destination);
  }
  // ...unchanged drum-sample-player branch + synth fallback...
```

In `src/audio/toneSampleBeatEngine.ts`, add to `ToneSampleBeatEngineOptions`:

```ts
  laneVoiceSamples?: Partial<Record<InstrumentId, Record<string, string>>>;
```

and pass it through in `createToneSampleBeatEngine`:

```ts
  const voiceBundle = createToneVoices(
    runtime,
    options.sampleUrls ?? {},
    effectsBus?.input,
    options.laneVoiceSamples ?? {},
  );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/audio/toneVoices.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full audio suite for regressions**

Run: `npx vitest run src/audio`
Expected: PASS (existing engine/voice tests unaffected — the new arg defaults to `{}`).

- [ ] **Step 6: Commit**

```bash
git add src/audio/toneVoices.ts src/audio/toneSampleBeatEngine.ts src/audio/toneVoices.test.ts
git commit -m "feat: route selected sampler voices through the engine (#122)"
```

---

### Task 6: Add `laneVoices` to sequencer state + URL serialization

Persist the per-lane voice selection in `SequencerState` and the share URL (`voices` param), defaulting to synth and round-tripping. Reuses Task 1/2 helpers.

**Files:**
- Modify: `src/lib/patternState.ts`
- Test: `src/lib/patternState.test.ts` (add cases; create if absent)

**Interfaces:**
- Consumes: `LaneVoiceSelection`, `createDefaultLaneVoiceSelection`, `cloneLaneVoiceSelection`, `laneVoiceSelectionIsDefault`, `serializeLaneVoiceSelection`, `deserializeLaneVoiceSelection` (Task 1); `normalizeLaneVoiceSelection` (Task 2).
- Produces: `SequencerState.laneVoices: LaneVoiceSelection`.

- [ ] **Step 1: Write the failing test**

```ts
// add to src/lib/patternState.test.ts
import { describe, expect, it } from "vitest";
import {
  createDefaultSequencerState,
  readSequencerStateFromParams,
  writeSequencerStateToParams,
} from "./patternState";
import { SYNTH_VOICE_ID } from "./laneVoiceSelection";

describe("laneVoices in sequencer state", () => {
  it("defaults every voiced lane to synth", () => {
    const state = createDefaultSequencerState("trap");
    expect(state.laneVoices).toEqual({
      melody: SYNTH_VOICE_ID,
      bassGuitar: SYNTH_VOICE_ID,
    });
  });

  it("omits the voices param when default", () => {
    const params = writeSequencerStateToParams(createDefaultSequencerState("trap"));
    expect(params.has("voices")).toBe(false);
  });

  it("round-trips a non-default voice selection", () => {
    const state = createDefaultSequencerState("trap");
    state.laneVoices = { melody: "piano", bassGuitar: "electric" };
    const params = writeSequencerStateToParams(state);
    expect(params.get("voices")).toBeTruthy();
    const restored = readSequencerStateFromParams(params);
    expect(restored.laneVoices).toEqual({ melody: "piano", bassGuitar: "electric" });
  });

  it("normalizes unknown voice ids from a hostile URL back to synth", () => {
    const params = new URLSearchParams({ style: "trap", voices: "melody~bogus" });
    expect(readSequencerStateFromParams(params).laneVoices.melody).toBe(SYNTH_VOICE_ID);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/patternState.test.ts`
Expected: FAIL — `laneVoices` undefined / `voices` param not written.

- [ ] **Step 3: Implement the state changes**

In `src/lib/patternState.ts`:

Add imports:
```ts
import {
  cloneLaneVoiceSelection,
  createDefaultLaneVoiceSelection,
  deserializeLaneVoiceSelection,
  laneVoiceSelectionIsDefault,
  serializeLaneVoiceSelection,
  type LaneVoiceSelection,
} from "./laneVoiceSelection";
import { normalizeLaneVoiceSelection } from "./instrumentVoices";
```

Add to `SequencerState`:
```ts
  laneVoices: LaneVoiceSelection;
```

In `createDefaultSequencerState` return object:
```ts
    laneVoices: createDefaultLaneVoiceSelection(),
```

In `readSequencerStateFromParams`, before the return, add:
```ts
  const laneVoices = normalizeLaneVoiceSelection(
    deserializeLaneVoiceSelection(params.get("voices")),
  );
```
and include `laneVoices,` in the returned object.

In `writeSequencerStateToParams`, before `return params;`:
```ts
  if (!laneVoiceSelectionIsDefault(state.laneVoices)) {
    params.set("voices", serializeLaneVoiceSelection(state.laneVoices));
  }
```

In `cloneSequencerState` return object:
```ts
    laneVoices: cloneLaneVoiceSelection(sequencer.laneVoices),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/patternState.test.ts`
Expected: PASS.

- [ ] **Step 5: Run lib suite for backcompat regressions**

Run: `npx vitest run src/lib`
Expected: PASS — older share links (no `voices` param) deserialize to the synth default.

- [ ] **Step 6: Commit**

```bash
git add src/lib/patternState.ts src/lib/patternState.test.ts
git commit -m "feat: persist laneVoices in sequencer state + share URL (#122)"
```

---

### Task 7: Add the "acoustic" sampled drum kit

Realistic drums reuse the existing kit system: add an `"acoustic"` `SampleKitId`, its manifest entry, and assets. No new selection mechanism — the existing Kit dropdown and `kit` URL param already cover it.

**Files:**
- Modify: `src/lib/sampleKitSelection.ts` (add `"acoustic"` to `SAMPLE_KIT_IDS`)
- Modify: `src/audio/sampleKit.ts` (add option + kit mapping)
- Create: `public/kit/acoustic/{kick,snare,hat,openHat,clap,808}.wav` + reference VCSL in `public/kit/LICENSE.md`
- Test: existing `src/audio/sampleKit.test.ts` (parametrized over `SAMPLE_KIT_OPTIONS`) now covers it automatically; add one explicit assertion.

**Interfaces:**
- Consumes: existing `createKit`, `SAMPLE_KIT_OPTIONS`, `SAMPLE_KITS` in `sampleKit.ts`.
- Produces: `SampleKitId` union now includes `"acoustic"`.

- [ ] **Step 1: Write the failing test**

Add to `src/audio/sampleKit.test.ts` inside `describe("sample kit manifest")`:
```ts
  it("offers an acoustic sampled kit", () => {
    expect(SAMPLE_KIT_OPTIONS.map((k) => k.id)).toContain("acoustic");
    const urls = getKitSampleUrls(undefined, "acoustic");
    for (const lane of REQUIRED_LANES) {
      expect(urls[lane]?.startsWith("/kit/acoustic/")).toBe(true);
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/audio/sampleKit.test.ts`
Expected: FAIL — `"acoustic"` not in options.

- [ ] **Step 3: Implement the kit entry**

In `src/lib/sampleKitSelection.ts`:
```ts
export const SAMPLE_KIT_IDS = ["classic", "punchy", "airy", "acoustic"] as const;
```

In `src/audio/sampleKit.ts`, append to `SAMPLE_KIT_OPTIONS`:
```ts
  {
    id: "acoustic",
    name: "Acoustic",
    description: "Sampled real drums (VCSL, CC0).",
  },
```
and add to `SAMPLE_KITS`:
```ts
  acoustic: createKit("acoustic", "acoustic"),
```

- [ ] **Step 4: Acquire + commit acoustic kit assets**

Export six VCSL drum one-shots (kick/snare/hat/openHat/clap/808) to mono 22050 Hz WAVs < 25 KB each (matching the existing kit budget asserted in `sampleKit.test.ts`) under `public/kit/acoustic/`. Append a VCSL attribution paragraph to `public/kit/LICENSE.md`.

- [ ] **Step 5: Run the kit suite to verify it passes**

Run: `npx vitest run src/audio/sampleKit.test.ts`
Expected: PASS — both the new assertion and the on-disk WAV test (parametrized over all kits) pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sampleKitSelection.ts src/audio/sampleKit.ts public/kit/acoustic public/kit/LICENSE.md src/audio/sampleKit.test.ts
git commit -m "feat: add acoustic sampled drum kit (#122)"
```

---

### Task 8: Wire selections into the live engine (App)

Make the running engine rebuild when the lane-voice selection changes and feed it the resolved sample maps. The existing `getEngine()` already rebuilds on a `styleId:sampleKitId` key — extend that key and pass `laneVoiceSamples`.

**Files:**
- Modify: `src/App.tsx` (engine key + `createBeatEngine` call)
- Modify: `src/audio/audioEngine.ts` (forward `laneVoiceSamples` option)

**Interfaces:**
- Consumes: `getSelectedLaneVoiceSamples` (Task 2); `ToneSampleBeatEngineOptions.laneVoiceSamples` (Task 5); `sequencer.laneVoices` (Task 6).

- [ ] **Step 1: Forward the option through `audioEngine.ts`**

In `src/audio/audioEngine.ts`, find the `createToneSampleBeatEngine({ sampleUrls: options.toneSampleUrls })` call (~line 56) and add the new field. Add `toneLaneVoiceSamples?` to the `createBeatEngine` options type and pass it:
```ts
      return createToneSampleBeatEngine({
        sampleUrls: options.toneSampleUrls,
        laneVoiceSamples: options.toneLaneVoiceSamples,
      });
```

- [ ] **Step 2: Extend the engine key + call in `App.tsx`**

In `getEngine()` (~line 626), include the voice selection in the rebuild key and pass the resolved maps:
```ts
    const toneSampleKey =
      audioEngineKind === "tone-sample"
        ? `${sequencer.styleId}:${sequencer.sampleKitId}:${serializeLaneVoiceSelection(sequencer.laneVoices)}`
        : null;
```
```ts
      engine = createBeatEngine({
        kind: audioEngineKind,
        toneSampleUrls:
          audioEngineKind === "tone-sample"
            ? getKitSampleUrls(sequencer.styleId, sequencer.sampleKitId)
            : undefined,
        toneLaneVoiceSamples:
          audioEngineKind === "tone-sample"
            ? getSelectedLaneVoiceSamples(sequencer.laneVoices)
            : undefined,
      });
```
Add imports at the top of `App.tsx`:
```ts
import { serializeLaneVoiceSelection } from "./lib/laneVoiceSelection";
import { getSelectedLaneVoiceSamples } from "./lib/instrumentVoices";
```

- [ ] **Step 3: Typecheck + full check**

Run: `npm run check`
Expected: PASS (typecheck + all tests). This is the integration gate — `App.tsx` has no unit test, so the typecheck + green suite is the verification here.

- [ ] **Step 4: Manual smoke (document in PR)**

Run `npm run dev`, switch the audio engine to Tone.js, set the Melody voice to Grand Piano, and confirm the melody lane plays piano (and falls back to synth if you throttle the network so samples fail). Note the result in the PR.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/audio/audioEngine.ts
git commit -m "feat: feed lane voice selection into the live engine (#122)"
```

---

### Task 9: Per-lane voice picker UI

Add a small dropdown per voiced lane, defaulting to Synth, following the existing Kit `<select>` in `SequencerControls.tsx`.

**Files:**
- Create: `src/components/LaneVoicePicker.tsx`
- Modify: `src/components/SequencerControls.tsx` (render pickers + props)
- Modify: `src/App.tsx` (pass `laneVoices` + an `onLaneVoiceChange` handler that updates state via the existing history/update path)
- Test: `src/components/LaneVoicePicker.test.tsx`

**Interfaces:**
- Consumes: `getLaneVoiceOptions` (Task 2), `VOICED_LANES`, `LaneVoiceSelection` (Task 1).
- Produces: `LaneVoicePicker` component with props `{ lane: VoicedLane; value: LaneVoiceId; onChange: (lane: VoicedLane, id: LaneVoiceId) => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/LaneVoicePicker.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LaneVoicePicker } from "./LaneVoicePicker";
import { SYNTH_VOICE_ID } from "../lib/laneVoiceSelection";

describe("LaneVoicePicker", () => {
  it("lists Synth first and fires onChange with the lane + id", () => {
    const onChange = vi.fn();
    render(<LaneVoicePicker lane="melody" value={SYNTH_VOICE_ID} onChange={onChange} />);
    const select = screen.getByLabelText(/melody voice/i) as HTMLSelectElement;
    expect(select.options[0].text).toBe("Synth");
    fireEvent.change(select, { target: { value: "piano" } });
    expect(onChange).toHaveBeenCalledWith("melody", "piano");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/LaneVoicePicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/LaneVoicePicker.tsx
import { getLaneVoiceOptions } from "../lib/instrumentVoices";
import type { LaneVoiceId, VoicedLane } from "../lib/laneVoiceSelection";

const LANE_LABEL: Record<VoicedLane, string> = {
  melody: "Melody voice",
  bassGuitar: "Bass voice",
};

export function LaneVoicePicker({
  lane,
  value,
  onChange,
}: {
  lane: VoicedLane;
  value: LaneVoiceId;
  onChange: (lane: VoicedLane, id: LaneVoiceId) => void;
}) {
  const label = LANE_LABEL[lane];
  return (
    <label className="control-field engine-field">
      <span className="eyebrow">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(lane, event.target.value)}
      >
        {getLaneVoiceOptions(lane).map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/LaneVoicePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into SequencerControls + App**

In `src/components/SequencerControls.tsx`: add props `laneVoices: LaneVoiceSelection` and `onLaneVoiceChange: (lane: VoicedLane, id: LaneVoiceId) => void`; render one `LaneVoicePicker` per `VOICED_LANES` entry just after the Kit `<label>` block (lines 164-178). Import `LaneVoicePicker`, `VOICED_LANES`, and the types.

In `src/App.tsx`: pass `laneVoices={sequencer.laneVoices}` and an `onLaneVoiceChange` handler that updates the sequencer through the same state/history update path used by `onSampleKitChange` (set `sequencer.laneVoices` to a new selection, normalized). Mirror the existing kit-change handler exactly.

- [ ] **Step 6: Run the full check**

Run: `npm run check`
Expected: PASS (typecheck + all tests, including `SequencerControls.test.tsx`). If the existing `SequencerControls.test.tsx` renders the component, add the two new required props there.

- [ ] **Step 7: Commit**

```bash
git add src/components/LaneVoicePicker.tsx src/components/LaneVoicePicker.test.tsx src/components/SequencerControls.tsx src/App.tsx
git commit -m "feat: add per-lane instrument voice picker UI (#122)"
```

---

### Task 10: Final verification + docs

- [ ] **Step 1: Full gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds; note any bundle-size warnings.

- [ ] **Step 3: Update the ticket/issue notes**

Append to `tickets/PR-46-open-source-instrument-sounds.md` a short "Shipped in v1 / deferred to parity PR" note, and record the `public/instruments` + `public/kit/acoustic` total size for the PR description.

- [ ] **Step 4: Commit**

```bash
git add tickets/PR-46-open-source-instrument-sounds.md
git commit -m "docs: note shipped vs deferred scope for instrument sounds (#122)"
```

---

## Self-Review

**Spec coverage:**
- Sounds (melodic + real drums) → Tasks 2/3 (melodic voices + assets), Task 7 (acoustic drum kit). ✓
- Per-lane sound picker, synth default → Task 9 (UI), Tasks 1/2 (synth-first manifest). ✓
- Lazy-load on selection → Tasks 5/8 (sampler built only when a non-synth map is passed; default selection passes no maps so nothing loads). ✓
- Live playback only; export unchanged → no task touches `styleRender.ts`/`exportBeat.ts`; Global Constraints + Tasks 5/6 keep export tests green. ✓
- VCSL CC0 source + manifest license tracking → Tasks 2/3/7 + LICENSE files. ✓
- Per-note WAV in `/public` + `Tone.Sampler` → Tasks 3/4. ✓
- State round-trip incl. selection → Task 6. ✓
- Fallback to synth on load failure → Tasks 4/5. ✓
- Fresh branch off clean `origin/main` → execution-time worktree (see handoff), not a code task. ✓

**Placeholder scan:** No TBD/TODO; every code step has concrete code. Asset-acquisition steps (3/7) are inherently manual but give exact paths, formats, size budgets, and the ffmpeg command. ✓

**Type consistency:** `LaneVoiceSelection`, `VoicedLane`, `NoteSampleMap`, `getSelectedLaneVoiceSamples`, `createSamplerVoice`, `laneVoiceSamples` used identically across Tasks 1–9. Engine option named `laneVoiceSamples` in both `toneVoices.ts` and `ToneSampleBeatEngineOptions`; App forwards it as `toneLaneVoiceSamples` through `audioEngine.ts`. ✓
