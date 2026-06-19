# PR-33 - Per-step velocity (ghost / normal / accent) + drag-to-paint

**Type:** Feature
**Depends on:** PR-30, PR-32
**Wave:** 4 (Beat Lab redesign)
**Related:** PR-30 (lane volume is the bus multiplier velocity stacks on),
PR-26 (WAV export must honor velocity)
**Source:** `Beat Lab.dc.html` — `paintDown`, `VELF = [0.55, 1, 1.45]`

## Context

Today a drum cell is binary on/off. The design gives each hit three dynamic
levels — **ghost (×0.55) / normal (×1) / accent (×1.45)** — so a beginner learns
that *how hard* a hit lands shapes the groove, not just *whether* it lands. The
gesture is: first tap turns a cell on at normal; tapping a lit cell cycles
normal → accent → ghost → off; press-and-drag paints normal hits across a lane.
Pitched lanes (808, melody) keep their existing pitch-cycle behavior and are not
velocity-painted.

## Scope

- **Data model**: add a per-lane `velocities: Record<InstrumentId, number[]>`
  (values `0` ghost / `1` normal / `2` accent; default all `1`) to
  `SequencerState`, with a normalizer + backward-compat default (older
  state/URLs/JSON with no velocities load every active step at normal, mirroring
  the PR-30 lane-volume backward-compat pattern). Serialize into pattern/URL
  state and project JSON.
- **Domain**: pure helpers for the cycle (`cycleStepVelocity`) and for the paint
  gesture, with the velocity factor map `[0.55, 1, 1.45]` as the single source of
  truth. Velocity multiplies on top of lane volume (PR-30) at the lane bus.
- **Engine**: per-hit gain = `laneVolume × velocityFactor` in the Web Audio and
  Tone engines (and the fake for the contract).
- **WAV export**: `renderPatternToPcm` / `renderBeatWav` scale each hit by its
  velocity factor.
- **UI** (in the PR-32 grid): tap cycles off → normal → accent → ghost → off;
  pointer drag paints normal hits (`pointermove` + `elementFromPoint`, guarded so
  it never paints pitched lanes). Cells render the three velocity states from the
  design (accent = filled + ring, ghost = dimmed inset). Keyboard activation
  toggles on/off at normal.

## Acceptance criteria

- Each drum step can be ghost / normal / accent; the level audibly scales only
  that hit and stacks correctly with the lane volume.
- Drag across a lane fills normal hits; pitched lanes are never painted by drag.
- Velocities round-trip through pattern/URL state and project JSON; older saved
  state without velocities loads every active step at normal without error.
- Exported WAV reflects velocities (ghost quieter, accent louder than normal).
- All three engines still satisfy `runAudioEngineContract`.
- Deterministic tests cover the velocity normalizer, the cycle helper, the
  serialization round-trip + backward-compat default, and that export scales a
  hit by its velocity factor.
