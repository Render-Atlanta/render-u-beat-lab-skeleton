# PR-39 Spike Findings — Song Decompose (Phase A)

**Status:** Phase A shipped (analysis modules + flag-gated harness). Real-track
accuracy and the Phase B go/no-go are filled in manually below.

## How to run

1. Start the app: `npm run dev`.
2. Open it with the dev flag: append `?songlab=1` to the URL.
3. A dashed "Song decompose (spike)" panel appears at the top. Drop in a
   `.wav` / `.mp3` / `.m4a` file (nothing uploads — analysis is client-side).
4. The panel shows the estimated BPM, an overall confidence %, the chosen
   one-bar window offset, and the decomposed 16-step pattern per lane.
5. "Load into grid" drops the decomposition onto the sequencer as a normal,
   editable beat (undo/redo, share, export all work from there).

## Methodology

- **Deterministic correctness** — tempo estimation, level-frame extraction, the
  one-bar window pick, decode, and quantization are covered by synthetic-PCM
  unit tests (`src/lib/{tempoEstimation,waveformToLevelFrames,oneBarWindow,
  audioFileDecode,songDecompose,decompositionToSequencerState}.test.ts`). These
  prove the math is right without any bundled audio.
- **Perceptual accuracy** — kick/snare/hat separation on real, polyphonic
  masters can only be judged by ear, so it is auditioned manually via the
  `?songlab=1` panel and recorded in the table below.

## Results (fill by auditioning real tracks)

| Track | Genre | True BPM | Est. BPM | Kick sep. | Snare sep. | Hat sep. | Notes |
|-------|-------|----------|----------|-----------|------------|----------|-------|
|       |       |          |          |           |            |          |       |
|       |       |          |          |           |            |          |       |
|       |       |          |          |           |            |          |       |

Rate separation 1–5 (1 = unusable, 5 = clean). Note octave errors (½× / 2×) in
the BPM column.

## Known limitations going in

- The classifier was tuned for **isolated beatbox**, not full mixes — expect
  weaker kick/snare/hat separation on dense, mastered tracks. Quantifying this is
  the central point of the spike.
- Tempo estimation depends on **onset quality**; sparse or heavily-swung material
  may octave-error (mitigated by folding into 60–180, not eliminated).
- Only the **single most onset-dense bar** is decomposed; intros/breakdowns are
  not representative and should be skipped when auditioning.

## Go / No-Go for Phase B

- **Tempo accuracy:** _TBD from table_
- **Drum separation quality:** _TBD from table_
- **Recommendation:** _TBD — decided together after auditioning. Phase B
  (sample-slicing, BPM/downbeat correction + re-quantize, polished UX) is gated
  on this._
