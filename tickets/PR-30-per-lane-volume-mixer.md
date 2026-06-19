# PR-30 - Per-lane volume mixer

**Type:** Feature
**Depends on:** PR-02, PR-11
**Wave:** 3 (more instruments, scaffolded)
**Related:** PR-26 (WAV export must honor lane volume), PR-27 (new lanes get faders too)

## Context

Beginners learn how a beat is balanced by *hearing* the effect of turning a
sound up or down — "the hats are too loud," "I can barely feel the kick." Today
every lane plays at a fixed, hard-coded gain (kick `0.9`, snare `0.42`, hat
`0.18`, open `0.14` in the Web Audio engine), so a learner can toggle steps but
cannot mix. A simple per-lane volume fader turns the sequencer into a tiny
mixer and teaches level balancing — the most basic production skill — without
adding option paralysis (one slider per existing lane, nothing new to choose).

This is a deliberately small mixer: **volume per lane only**. No pan, no
mute/solo, no per-step velocity in this ticket (those are future waves).

## Scope

- Add a per-lane volume model (e.g. `0`–`1.5`, default `1`) to the sequencer
  state, serialized in pattern/URL state and the project JSON, with a
  normalizer + backward-compat default (older projects/URLs with no volume map
  load at `1`, mirroring the `source` backward-compat pattern in PR-25).
- Engine: route each lane through a per-lane gain so the stored volume scales
  that lane's output, in both the Web Audio and Tone engines (and the fake for
  the contract). Keep the existing per-voice envelope gains; the lane volume is
  a multiplier on top, applied at the lane bus.
- WAV export: `renderPatternToPcm` (and `renderBeatWav`) must scale each lane's
  mixed samples by its volume so the download matches what the user hears.
- UI: a compact volume fader on each track row in the sequencer, labelled and
  keyboard-accessible; reset-to-default affordance. Reuse the existing control
  styling.

## Acceptance criteria

- Each lane has a volume fader; changing it audibly scales only that lane.
- Lane volumes round-trip through pattern state, URL share, and project JSON;
  older saved state without volumes loads at the default (`1`) without error.
- The exported WAV reflects the lane volumes (a lane turned to `0` is silent in
  the download; turned down is quieter).
- All three engines still satisfy `runAudioEngineContract`.
- Deterministic tests cover the volume normalizer, serialization round-trip +
  backward-compat default, and that export scales a lane (e.g. volume `0` →
  that lane contributes no energy to the rendered PCM).
