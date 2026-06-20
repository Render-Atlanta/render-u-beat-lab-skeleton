# PR-39 Phase A — Song Upload, Analysis & Decomposition (Spike) — Design

**Ticket:** `tickets/PR-39-song-upload-decompose.md` · **Issue:** #90
**Type:** Spike (de-risk, throwaway-friendly) → gates Phase B
**Date:** 2026-06-19

## Goal

Let a user drop in an audio file (wav/mp3/m4a) and get back an **estimated BPM**
plus a **quantized one-bar drum pattern** decomposed into the Beat Lab lanes,
with a **confidence readout** — ending by producing an editable `SequencerState`.
Phase A is a measurement spike: prove the pure analysis is correct on synthetic
fixtures, expose a flag-gated harness so real tracks can be auditioned manually,
and produce a go/no-go for Phase B.

## Guiding principle

Maximize reuse of the existing mic → onset → classify pipeline. The only
genuinely new logic is **tempo estimation**, the **one-bar window pick**, and a
small **waveform → level-frame adapter**. Everything analytical is pure and unit
tested; the UI is throwaway and flag-gated.

## Reused building blocks (no changes)

- `src/lib/producerTagSample.ts` — `decodeProducerTagSample(blob)` decodes any
  browser-supported file via `AudioContext.decodeAudioData`, downmixes to mono,
  resamples to 22050 Hz.
- `src/lib/wav.ts` — `decodeWav(buf)` fast-path for `.wav`.
- `src/lib/onsetDetection.ts` — `waveformToAmplitudeEnvelope`, `detectOnsets`,
  `mapOnsetsToStepHits` / `quantizeOnsetsToSteps`, `createOnsetPreview`.
- `src/lib/beatboxClassifier.ts` — `classifyBeatboxHits(preview, levels, opts)`,
  `classifiedHitsToPattern`.
- `src/lib/meydaBeatboxAnalysis.ts` — `createMeydaBeatboxAnalysisProvider()`.
- `src/lib/patternState.ts` — `createDefaultSequencerState(styleId)`.
- `src/lib/sequencerDomain.ts` — `updateSequencerBpm` (clamps 60–180), helpers.
- `src/lib/captureAnalysis.ts` — reference wiring this path mirrors.

## New modules (`src/lib/`)

### 1. `audioFileDecode.ts`
`decodeAudioFile(blob: Blob): Promise<DecodedAudio>` — `.wav` → `decodeWav`
fast-path; otherwise reuse the `decodeProducerTagSample` AudioContext path.
Returns `{ samples: Float32Array, sampleRate: number, durationMs: number }`.
Mostly composition over existing code; thin.

### 2. `tempoEstimation.ts` ⭐ (the real new pure logic)
`estimateTempo(onsetTimesMs: number[], opts?): TempoEstimate`
- Build a histogram of inter-onset intervals (IOIs) between successive onsets.
- Convert each candidate interval to BPM; **octave-fold** (×2 / ÷2) into the
  60–180 guardrail.
- Pick the dominant bin; `confidence` = dominant-bin mass / total.
- Returns `{ bpm: number, confidence: number, candidates: {bpm:number, weight:number}[] }`.
- Pure & deterministic → unit tested over synthetic onset trains.

### 3. `waveformToLevelFrames.ts`
`waveformToLevelFrames(samples: Float32Array, sampleRate: number, frameMs = 50):
MicLevelFrame[]` — emit `{ atMs, rms, peak }` per ~50 ms window. Bridges decoded
PCM into the classifier, which consumes `MicLevelFrame[]`.

### 4. `songDecompose.ts` (orchestrator)
`decomposeSong(decoded: DecodedAudio, opts?): SongDecomposition`
1. `waveformToAmplitudeEnvelope(samples, durationMs)`
2. `detectOnsets(envelope)` → onset times
3. `estimateTempo(onsetTimesMs)` → `{ bpm, confidence }`
4. Pick a downbeat-aligned **one-bar window**: bar length = one 4-beat loop at
   the estimated BPM; choose the start offset whose window captures the most
   onset energy (deterministic scan over candidate bar starts).
5. Quantize onsets within the window to the 16-step grid.
6. `waveformToLevelFrames(samples, sampleRate)` → synth level frames.
7. `classifyBeatboxHits(preview, levels, { provider: meyda, waveform, durationMs })`.
8. Return `{ bpm, bpmConfidence, window: {startMs, bars:1}, pattern,
   classifications, overallConfidence }` where `overallConfidence` blends BPM
   confidence and mean per-hit classification confidence.

### 5. `decompositionToSequencerState.ts`
`decompositionToSequencerState(decomp: SongDecomposition): SequencerState` —
`createDefaultSequencerState(DEFAULT_STYLE)` patched with the decomposed
`pattern` and clamped `bpm` (via `updateSequencerBpm`). **This is the
"ends by producing a SequencerState" deliverable**, routed through existing
domain helpers so the result is a normal editable beat (undo/redo, share,
export all work downstream).

## UI (throwaway, flag-gated)

`SongDecomposePanel` (new component) — drag/drop + file picker, rendered only
when a dev flag is set (`?songlab=1` query param). Shows:
- estimated **BPM**,
- a **read-only 16-step grid** of the decomposed pattern,
- per-lane classification (hit count / confidence),
- an **overall confidence readout**,
- a **"Load into grid"** button → `decompositionToSequencerState` → drops into
  app state (the minor `App.tsx` wiring; behind the same flag).

## Tests (deterministic, synthetic PCM — no bundled audio)

- `tempoEstimation.test.ts` — onset trains at 90/120/140 BPM; assert bpm within
  tolerance and octave-folding (e.g. 60↔120 resolve into range).
- `waveformToLevelFrames.test.ts` — deterministic rms/peak over a known buffer
  (silence, full-scale, a single burst).
- `songDecompose.test.ts` — synthesize a `Float32Array` with low-frequency
  bursts (kick-ish) + noise bursts (hat/snare-ish) at known step positions for a
  known BPM; assert the **quantized step positions** and **bpm** (the robust
  parts). Classification correctness on synthetic material is a softer assert
  (lane membership sanity, not exact labels).

A small in-test PCM synthesis helper (impulse/burst generator at a given BPM and
step map) backs the song-decompose and level-frame tests; it lives in the test
file/test-utils, not in shipped `src/lib`.

## Findings doc

`docs/spikes/PR-39-song-decompose-findings.md` — methodology + a table the user
fills by dragging real tracks through the panel:

| Track | Genre | True BPM | Est. BPM | Kick sep. | Snare sep. | Hat sep. | Notes |

Plus a **go/no-go** section completed together after real-track auditioning.
(Authoring note: the AI cannot audition audio, so perceptual accuracy is filled
manually; synthetic tests cover the deterministic correctness.)

## Acceptance criteria (Phase A)

- Upload a file → see estimated BPM + a quantized one-bar pattern + confidence.
- Pure steps (tempo estimate, level frames, quantization window) have
  deterministic unit tests over fixture/synthetic PCM.
- Findings doc + harness in place to measure real tracks and decide go/no-go.
- `npm run check` and `npx tsc --noEmit` pass.

## Explicitly out of scope / deferred to Phase B (gated)

- Sample-slicing path (per-onset one-shot buffers + sample-kit assignment).
- BPM/downbeat correction controls + re-quantize.
- Polished, always-on upload UX.
- Full recreate-path integration beyond the minimal "Load into grid".
- Melodic/harmonic transcription and stem separation (out of the ticket entirely).

## Risks

- **Onset quality on polyphonic masters** drives both tempo and decomposition;
  the spike measures this rather than assuming it.
- **Classifier was tuned for isolated beatbox**, not full mixes — expect weaker
  kick/snare/hat separation; this is the central thing the findings doc records.
- **Sample-rate / resample** differences are handled by reusing the
  `producerTagSample` path (22050 Hz working rate).
