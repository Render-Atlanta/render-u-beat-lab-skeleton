# PR-39 - Song upload, analysis & decomposition

**Type:** Spike → Feature
**Depends on:** PR-05 (onset detection + quantization), PR-06 (beatbox lane
classification), PR-14 (Meyda analysis spike), PR-08 (arrangement + export)
**Related:** PR-04 (mic capture — shares the analysis pipeline shape)
**Source:** New feature request

## Context

Today a beginner can capture a short beatbox through the mic and have it
classified into lanes. The natural next step is "give me a song I already love
and help me rebuild it here." Uploading an audio file, estimating its tempo,
decomposing its drums into the Beat Lab grid, and optionally slicing it into
reusable one-shot samples turns any track into a starting point the workshop can
teach from.

Full-song decomposition is materially harder than isolated beatbox onsets:
uploaded audio is polyphonic, mastered, and stereo, so drum hits overlap melodic
and vocal content. This ticket is therefore phased — a **spike** to measure what
is realistically achievable on representative tracks before committing to the
full feature surface.

## Scope

### Phase A — Spike (de-risk, throwaway-friendly)

- Add an audio-file upload path (drag/drop or file picker) that decodes
  wav/mp3/m4a into PCM via `AudioContext.decodeAudioData`, reusing/extending
  `src/lib/wav.ts` for wav and the browser decoder for compressed formats.
- Tempo estimation: detect the dominant BPM (autocorrelation / inter-onset-
  interval histogram over the existing onset detector in
  `src/lib/onsetDetection.ts`), clamped to the 60–180 guardrails.
- Run the uploaded PCM through the existing onset → classification pipeline
  (`src/lib/onsetDetection.ts`, `src/lib/beatboxClassifier.ts`,
  `src/lib/meydaBeatboxAnalysis.ts`) and quantize hits to the 16-step grid for
  one bar (or a chosen downbeat-aligned window).
- Produce a confidence/quality readout and document, with example files, how
  accurate kick/snare/hat separation is on real tracks. Decide go/no-go and the
  realistic Phase B surface from the spike's findings.

### Phase B — Feature (gated on the spike)

- "Recreate" path: turn the decomposed analysis into a `SequencerState`
  (pattern + bpm + per-lane data) the user can drop onto the grid and edit, going
  through the same domain helpers as a normal beat so undo/redo, share links, and
  export all work.
- "Sample" path: slice the uploaded audio at detected onsets into per-hit one-
  shot buffers the user can audition and assign to lanes, integrating with the
  sample-kit engine (PR-13). Export remains WAV/JSON.
- Surface tempo/downbeat controls so the user can correct a wrong BPM or bar
  offset, and re-quantize.

## Acceptance criteria

### Phase A
- A user can upload an audio file and see an estimated BPM plus a quantized
  one-bar drum pattern derived from it.
- The spike documents measured accuracy on a small set of representative tracks
  and a clear go/no-go recommendation for Phase B.
- Pure analysis steps (tempo estimate, quantization window) have deterministic
  unit tests over fixture PCM.

### Phase B (if greenlit)
- The decomposed beat loads as an editable `SequencerState` (recreate) and/or as
  assignable one-shot samples (sample), with no regressions to playback, share,
  or export.

## Out of scope

Melodic/harmonic transcription (chords, basslines, melody) and stem separation
(vocals/instruments) — this ticket targets drums/rhythm decomposition and raw
slicing only. Copyright/licensing UX for user-uploaded audio is handled
separately; analysis happens client-side and uploaded audio is not persisted
server-side.
