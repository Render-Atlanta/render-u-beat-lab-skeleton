# PR-36 - Tap tempo

**Type:** Feature
**Depends on:** PR-32
**Wave:** 4 (Beat Lab redesign)
**Related:** PR-02 (BPM control)
**Source:** `Beat Lab.dc.html` — `tapTempo`

## Context

Typing a number is an abstract way to set tempo; tapping a button in time with a
feel you already have in your head is how musicians actually find a BPM. A small
tap-tempo button next to the BPM field averages the interval of recent taps into
a BPM, clamped to the existing 60–180 guardrails.

## Scope

- A pure `tapTempo` helper: given tap timestamps, average the last N intervals
  (resetting after a >2s gap), convert to BPM, clamp to 60–180. No state held in
  the helper — the caller passes timestamps.
- Wire the PR-32 "Tap" button: each press records `performance.now()`, recomputes
  BPM from the last ≤4 taps, and updates the sequencer BPM (audible without
  restart, same path as the BPM input).

## Acceptance criteria

- Tapping the button in a steady rhythm sets a BPM matching the tap rate, clamped
  to 60–180; a pause >2s starts a fresh measurement.
- The new BPM applies live during playback (no restart needed) and updates the
  BPM field.
- Deterministic tests cover the averaging, the >2s reset, and clamping at both
  bounds.
