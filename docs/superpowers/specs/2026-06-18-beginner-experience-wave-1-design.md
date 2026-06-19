# Beginner Experience — Wave 1 Design (Visual Feedback)

**Date:** 2026-06-18
**Tickets:** PR-22 (playhead), PR-23 (role coaching), PR-24 (EQ visualizer)
**Audience:** RenderATL workshop attendees — software builders, not musicians.

## Goal

Make the playing loop *legible* to a beginner. Today the grid is static while
audio plays, nothing explains what each lane is for, and there is no live
feedback on the sound. Wave 1 adds three low-effort, high-learning-value visual
layers, all sharing one new engine capability: telling the UI what the audio is
doing right now.

Research basis (verified, primary sources): direct-manipulation grids that
"show the inside of a pattern" and visible playback state help non-musicians
learn by cause-and-effect (Ableton Learning Music); teach one role at a time
(Ableton / Hookpad); an `AnalyserNode` → canvas frequency bar visualizer is a
documented low-effort Web Audio pattern (MDN). These are design rationale, not
measured learning outcomes — we adopt the patterns the best tools use.

## Scope boundary

In scope: playhead highlighting, per-lane role copy, EQ spectrum meter. Out of
scope: recording/scheduling the producer tag (Wave 2), new instruments and
melody (Wave 3). No change to the pattern data model or URL state.

## Architecture

Three features, one shared seam. The audio engine becomes the single source of
truth for "what is happening now," exposing two new read paths that the UI
samples. The pattern data model, transport math, and producer-tag paths are
untouched.

```
                 ┌─────────────────────────── AudioEngine ──────────────────────────┐
   start(style)→ │  look-ahead scheduler (unchanged)                                 │
                 │     │ schedules {stepIndex, audioTime} into a pruned stepQueue     │
                 │     ├─► getActiveStep() ── returns the step whose audioTime has    │
                 │     │      passed context.currentTime (NOT the scheduled-ahead one)│
                 │     └─► AnalyserNode on master gain ── getFrequencyData(buf)        │
                 └───────────────────────────────────────────────────────────────────┘
                  both PULLED by the React layer (no rAF inside the engine):
                          │ getActiveStep() @ rAF          │ getFrequencyData() @ rAF
                          ▼                                 ▼
                 App rAF poll → currentStep state   EqVisualizer (canvas, rAF)
                          ▼                                 reads engine directly,
                 SequencerPanel: playhead column           bypasses React state
                 + pad pulse;  track labels: role copy (static data, no engine)
```

### Component / module units

- **Transport playhead helper (pure, new):** `getActiveStep(queue, currentTime)`
  — given the scheduled `{stepIndex, time}` entries and the audio clock, returns
  the step that should currently be lit (the latest entry whose `time <=
  currentTime`), or `null`. Pure and unit-testable with no audio. This isolates
  the only nontrivial logic from the rAF/audio glue.
- **AudioEngine contract (extended):** add two **pull** methods to the
  `AudioEngine` interface (no callbacks/rAF inside the engine — consistent with
  the existing timer-mocked, pull-style `getFrequencyData` design):
  - `getActiveStep(): number | null` — the step index that should currently be
    lit, derived from the scheduled queue and the audio clock; `null` when not
    playing.
  - `getFrequencyData(target: Uint8Array): boolean` — fills a caller-owned
    buffer with the current spectrum; returns `false` when no analyser/audio is
    available (engine idle or unsupported). Caller owns the array to avoid
    per-frame allocation.
- **Web Audio engine (changed):** push `{stepIndex, time}` into a pruned queue
  as it schedules; `getActiveStep()` returns
  `getActiveStep(queue, context.currentTime)`. Add an `AnalyserNode` between
  `master` and `destination` (insert without altering the audible signal) and
  implement `getFrequencyData`. The queue clears on `stop()`/`dispose()`.
- **Tone.js engine (changed):** maintain the same `{stepIndex, time}` queue from
  the transport callback and return `getActiveStep` against the Tone clock; tap
  a `Tone.Analyser`/analyser node for `getFrequencyData`. Same external
  contract.
- **Fake engine (changed):** expose a settable active step and frequency state
  so tests drive it deterministically; default `getActiveStep()` → `null`,
  `getFrequencyData` → `false`. Keeps the shared contract suite green.
- **`SequencerPanel` (changed):** accept `activeStep: number | null`; mark the
  active column and pulse pads that fire on it. Track label gains the role copy
  from PR-23. Reduced-motion: no pulse animation, column still marked.
- **`EqVisualizer` (new component):** owns a `<canvas>` and a `requestAnimation
  Frame` loop that calls `engine.getFrequencyData` into a reused buffer and
  draws bars. The raw-bins → bar-heights transform is a pure helper
  (`mapFrequencyBars(data, barCount)`, log-ish so high frequencies stay
  visible) tested standalone; the canvas/rAF glue is thin browser-only code.
  Cleans up its loop on unmount/stop. Reduced-motion: render a low-rate/static
  frame.
- **Instruments metadata (changed, PR-23):** `instruments.ts` gains a `role`
  and one-line `explainer` per lane. Pure data; no engine involvement.

### Data flow

1. `App.start()` → `engine.start(style)`; App starts a `requestAnimationFrame`
   poll and renders `<EqVisualizer engine=…/>`.
2. While playing, the poll reads `engine.getActiveStep()` and calls
   `setCurrentStep` only when the value changes (≈step rate, not 60fps). App
   passes `currentStep` to `SequencerPanel`.
3. `EqVisualizer` independently pulls `getFrequencyData` at 60fps and draws —
   never touching React state, so the 60fps path causes zero re-renders.
4. `stop()` stops the poll; `currentStep` resets to `null`; the canvas goes
   idle.

### Why this split

The two new read paths have very different rates. Step changes (~8–12/sec) go
through React state cheaply (the poll only `setState`s on change). Spectrum
frames (60/sec) bypass React entirely and draw straight to canvas, or we'd
thrash the reconciler. Pull beats push here: the engine stays
callback-free and timer-mockable (matching the existing contract suite), and the
only nontrivial logic — the active-step *decision* — lives in a pure helper that
is testable without a browser, audio, or timers.

## Error handling & edge cases

- **No analyser / unsupported / idle:** `getFrequencyData` returns `false`; the
  visualizer draws an idle baseline and does not error.
- **Reduced motion:** `prefers-reduced-motion` disables pad-pulse and high-rate
  canvas animation; the playhead column is still marked statically.
- **Stop/restart and engine switch:** the draw loop and step listener are torn
  down on `stop()`/`dispose()`; switching Web Audio ↔ Tone.js re-subscribes
  against the new engine. No dangling rAF loops.
- **BPM/swing changes:** highlight stays aligned because the active step is
  derived from scheduled audio `time`, not a fixed wall-clock interval.

## Testing strategy

- **Pure helper:** `getActiveStep` unit tests — ordering, boundary (`time ==
  currentTime`), empty queue → `null`, wrap-around at step 15→0.
- **Engine contract:** extend `engineContract.ts` so every engine proves
  `getActiveStep()` returns the scheduled step for an advanced clock and `null`
  before start / after stop, and that `getFrequencyData(buf)` returns a boolean
  without throwing. Web Audio test drives `FakeAudioContext.currentTime`; the
  fake engine exposes a settable active step.
- **Component (`renderToStaticMarkup`, matching the existing suite):**
  `SequencerPanel` renders the active column / pulses the right pads for a given
  `activeStep` prop and respects reduced-motion. `EqVisualizer` renders its
  `<canvas>` + accessibility attributes; the rAF/canvas draw loop is browser-
  only glue and is not unit-tested — its logic lives in the pure
  `mapFrequencyBars` helper, which is.
- **Metadata:** assert each instrument lane has non-empty `role`/`explainer`.
- No real audio, timers, or wall-clock in CI — consistent with existing suites.

## Rollout / sequencing

PR-23 (pure data + label) can land first and independently. PR-22 introduces the
`setStepListener` seam; PR-24 adds the analyser seam — both extend the engine
contract, so they should land after PR-23 and can be reviewed back-to-back. All
three ship behind no flags; they are additive and degrade gracefully.
