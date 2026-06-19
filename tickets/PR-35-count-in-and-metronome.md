# PR-35 - Count-in & metronome

**Type:** Feature
**Depends on:** PR-11, PR-32
**Wave:** 4 (Beat Lab redesign)
**Related:** PR-22 (playhead), PR-24 (transport visuals)
**Source:** `Beat Lab.dc.html` — `countIn` / `metro` state, `togglePlay`
count-in branch, count-in overlay

## Context

Beginners struggle to come in on time and to feel the grid. A **count-in**
(four audible clicks with a big on-screen "4·3·2·1" overlay before playback
starts) and a **metronome** (a click on each beat during playback) are standard
practice aids. Both are toggles that sit in the sequencer control row.

## Scope

- **Engine**: a short click/tick voice exposed by the engine adapter (added to
  Web Audio + Tone + fake), played on demand without disturbing the pattern.
- **Count-in**: when enabled, pressing play runs a 4-beat count (tempo-accurate
  from BPM) with the `bx-count` overlay before the loop starts; pressing play
  again during the count cancels it.
- **Metronome**: when enabled, an accented beat-1 / plain beat-2-3-4 click fires
  each quarter-note during playback, and the transport metronome dot pulses.
- Wire the PR-32 count-in / metronome toggle buttons and the count-in overlay.

## Acceptance criteria

- With count-in on, play shows the 4·3·2·1 overlay and four clicks at the current
  tempo, then starts the loop; cancelling mid-count stops cleanly.
- With metronome on, a click lands on every beat during playback (beat 1
  accented) and the transport dot pulses; toggling off silences it immediately.
- Neither feature alters the stored pattern or the exported WAV.
- All three engines still satisfy `runAudioEngineContract` (extended with the
  click voice).
- Deterministic tests cover count-in scheduling/cancel and metronome click
  timing (beats per loop, accent on beat 1).
