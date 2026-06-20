# Beat Lab — Beat Ruler, Bass Guitar & Guided Mode — Design

**Date:** 2026-06-19
**Source:** User feedback against the `Beat Lab.dc.html` design brief + a new instrument request.

## Overview

Three user-requested improvements, shipped as three independent PRs:

1. **PR-A — Beat-number ruler** (brief fidelity): the `1 2 3 4` beat ruler above
   the 16-step grid is missing.
2. **PR-B — More-instructive guided mode**: restore brief elements the build
   dropped and deepen the beginner copy.
3. **PR-C — Bass-guitar lane** (new instrument, via the `smplr` sample library).

Build order: **PR-A** anytime (isolated); **PR-B → PR-C** sequentially, because
both edit `src/lib/instruments.ts` and PR-C's new lane flows through PR-B's
guided sequence. (Same conflict-avoidance lesson as the House/NOLA style PRs.)

The real gate is local: `npm run check` + `npx tsc --noEmit`. No GitHub Actions
CI. CodeRabbit credits exhausted (non-blocking).

---

## PR-A — Beat-number ruler

### Goal
Match the brief: a static `1 2 3 4` ruler above the 16-step grid, each number
spanning 4 sixteenth-steps, alongside the existing downbeat marks and moving
playhead.

### Brief reference (verbatim)
```html
<span style="grid-column:1 / span 4; ...">1</span>
<span style="grid-column:5 / span 4; ...">2</span>
<span style="grid-column:9 / span 4; ...">3</span>
<span style="grid-column:13 / span 4; ...">4</span>
```

### Design
- Add a ruler row in `src/components/SequencerPanel.tsx` directly above the step
  grid: four cells, each `grid-column: span 4`, labelled 1–4, aligned to the same
  16-column grid the steps use. The current beat (derived from `activeStep`,
  `Math.floor(activeStep / 4)` → 0–3) gets an `is-current` class so the active
  beat highlights with the playhead.
- Keep existing `downbeat` marks and `activeStep` playhead untouched.
- Transport label: the brief shows a `Playing / Count-in / bar N/M` readout. If a
  transport label is already present, leave it; if not, add a minimal
  `Playing / Stopped / Count-in` label near the transport. (Confirm during impl by
  reading `App.tsx`; do not duplicate an existing one.)

### Files
- `src/components/SequencerPanel.tsx` (ruler row), `src/index.css` (ruler styles).

### Tests
- `SequencerPanel.test.tsx`: renders four ruler cells labelled 1–4; the cell for
  `Math.floor(activeStep/4)` carries the current-beat class for a given
  `activeStep`.

### Acceptance
- The `1 2 3 4` ruler appears above the grid, columns aligned, current beat
  highlights during playback. `npm run check` + `tsc` green.

---

## PR-B — More-instructive guided mode

### Goal
The brief's guided panel is richer than the current build. Restore the missing
pieces and make the per-lane copy genuinely instructive for beginners.

### Gaps vs. brief (current build is missing these)
- A **"← Previous layer"** button (brief has Previous + Next).
- The **"★ Earlier layers stay live — tap any lane above to edit it."** coaching
  line.

### Design
- **`src/lib/instruments.ts`** — add an optional `guidedTip: string` to each
  `InstrumentOption`: a concrete interaction hint, e.g.
  - kick → "Lands on the main beats — it's the pulse everything else answers to."
  - snare → "Put it on beats 2 and 4 to answer the kick. Try tapping those first."
  - hat → "Fills the gaps. Every step = busy; every other step = laid back."
  - openHat → "One or two per bar adds lift — great right before the next bar."
  - clap → "Stack it on the snare to fatten the backbeat."
  - 808 → "The sub-bass. Pitch it to follow your root note for movement."
  - melody → "An in-key hook. A few notes go a long way."
  (Existing `role` + `explainer` stay; `guidedTip` is the new instructive layer.)
- **`src/lib/guidedMode.ts`** — add `retreatGuidedStep(state)` (decrement,
  clamped at 0), mirroring `advanceGuidedStep`. Revealed-lane logic already keys
  off `stepIndex`, so it works unchanged.
- **`src/components/GuidedModeBanner.tsx`** — render `guidedTip` below the
  explainer; add the "Earlier layers stay live…" line; add a "← Previous layer"
  button (disabled on the first step) wired to a new `onPrevious` prop. Keep
  Next/Finish/Skip/Exit.
- **`src/App.tsx`** — wire `onPrevious` to `retreatGuidedStep`.

### Files
- `src/lib/instruments.ts`, `src/lib/guidedMode.ts`,
  `src/components/GuidedModeBanner.tsx`, `src/App.tsx`, `src/index.css`.

### Tests
- `guidedMode` (or new `guidedMode.test.ts`): `retreatGuidedStep` decrements and
  clamps at 0; `advanceGuidedStep`/retreat are inverse within bounds.
- `GuidedModeBanner.test.tsx`: renders `guidedTip` and the earlier-layers line;
  Previous button disabled on step 0, calls `onPrevious` otherwise.

### Acceptance
- Guided mode shows a per-lane tip + the earlier-layers coaching line and supports
  Previous/Next navigation. `npm run check` + `tsc` green.

---

## PR-C — Bass-guitar lane (via `smplr`)

### Goal
A new **pitched** instrument lane distinct from the `808` sub-bass — a real
electric-bass-guitar voice (`smplr` `electric_bass_finger` Soundfont).

### Decisions (locked)
- **New lane** `bassGuitar`, inserted in `INSTRUMENT_IDS` after `808`, before
  `melody` (guided order …808 → bassGuitar → melody).
- Metadata: label "Bass Gtr", role "Bassline", explainer + `guidedTip`.
- **Pitched**: new `bassGuitarStepPitches` in `SequencerState` (mirrors
  `bassStepPitches`/`melodyStepPitches`), its own register offset **between** the
  808 sub and the melody. `isPitchedLane("bassGuitar")` → true; reuse the
  existing scale-locked pitch palette machinery in `stepPitch.ts`.
- **Library**: `smplr` `electric_bass_finger`. The soundfont is **bundled
  locally** (not loaded from a CDN) so offline WAV export stays offline and
  deterministic.
- **Default style content**: each style auto-gets a simple **root-note bassline
  derived from its existing `808` hits** (fall back to `kick` hits if a style has
  no 808), at the key root — generated by a helper, fully editable. No hand-
  authored per-style basslines.

### Architecture
- **Types/metadata**: `src/lib/patterns.ts` (`InstrumentId` union +
  `INSTRUMENT_IDS`), `src/lib/instruments.ts` (new entry). `Pattern`,
  `laneVolumes`, `laneMutes`, `stepVelocities` auto-expand via
  `Record<InstrumentId, …>`.
- **Pitch state**: `src/lib/stepPitch.ts` (add `BassGuitarStepPitches` type +
  register offset + palette getter), `src/lib/patternState.ts` (add field +
  defaults + serialization), `src/lib/sequencerDomain.ts`
  (`updateSequencerBassGuitarStepPitch`, include in `isPitchedLane`).
- **Default basslines**: a pure helper `deriveRootBassline(pattern, key)` (new,
  unit-tested) that produces a `bassGuitar` boolean lane + `bassGuitarStepPitches`
  from a style's 808/kick hits at the root degree. Applied when building each
  `BEAT_STYLES` entry (or at default-state construction).
- **Audio (injectable port, testable)**: define a small `BassGuitarVoicePort`
  interface (mirrors the `MeydaRuntimePort` pattern) so the pure scheduling is
  unit-testable and `smplr` is the production adapter.
  - `src/audio/webAudioBeatEngine.ts`: load the bundled soundfont at init; per
    step, trigger the voice at the step's pitch via the port.
  - `src/audio/toneSampleBeatEngine.ts`: same via its sample path.
  - **Offline export** `src/lib/styleRender.ts`: render the bass-guitar lane to
    PCM. Preload the bundled soundfont buffers into the `OfflineAudioContext`
    before rendering; if buffers are unavailable, render silence for that lane
    (export must never throw). This is the main integration risk and gets explicit
    tests on the pure pieces (pitch selection, lane gating).
- **Styles + profiles**: `src/lib/beatStyles.ts` (basslines via the helper),
  regenerate `src/lib/styleProfiles.generated.ts`
  (`npm run generate:style-profiles`), update
  `src/test/beatStyleFixtures.ts` golden fixtures.
- **UI**: `SequencerPanel.tsx` auto-renders the new lane; ensure the pitched-step
  editing UI treats `bassGuitar` like `808`/`melody`.

### Tests
- `stepPitch`/new helper: `deriveRootBassline` places bass hits on the 808/kick
  steps at the root degree; `getBassGuitarPalette` register sits between bass and
  melody.
- `sequencerDomain`: `updateSequencerBassGuitarStepPitch` clamps; `isPitchedLane`
  includes `bassGuitar`.
- `patternState`: serialize/deserialize round-trips `bassGuitarStepPitches`.
- `beatStyles.golden`: regenerated fixtures include the `bassGuitar` lane.
- Audio: the pure scheduling against a fake `BassGuitarVoicePort` triggers the
  expected notes; export renders the lane via the port (or silence on missing
  buffers) without throwing. The real `smplr` adapter is not unit-tested (browser
  audio), same as the Meyda adapter.

### Acceptance
- "Bass Gtr" appears as a new pitched lane, plays on both engines, exports to WAV,
  and ships a derived root-note bassline per style. Guided mode introduces it.
  `npm run check` + `tsc` green; golden fixtures regenerated.

### Out of scope (→ roadmap)
Per-style hand-authored basslines, a full piano-roll, additional sampled kits,
MIDI export, essentia.js analysis, Drummer-style fills. See
`docs/roadmap/beatlab-backlog.md`.
