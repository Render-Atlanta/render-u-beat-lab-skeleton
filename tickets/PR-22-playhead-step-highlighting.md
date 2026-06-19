# PR-22 - Playhead step highlighting

**Type:** Feature
**Depends on:** PR-11
**Wave:** 1 (visual feedback)

## Context

Beginner-focused tools win by making cause-and-effect legible: direct
manipulation plus visible playback state. Today the engine runs a look-ahead
scheduler (`webAudioBeatEngine.ts`) but never tells the UI which step is
currently sounding, so the grid is static while the loop plays. A moving
playhead is the highest learning-ROI-per-effort change and is the foundation
the EQ visualizer and "tag in the beat" features reuse.

Research basis: direct-manipulation grids that "show the inside of a pattern"
(Ableton Learning Music) and visible playback state help non-musicians learn by
watching the loop.

## Scope

- Add a current-step callback to the audio engine contract (e.g.
  `onStep(stepIndex)` emitted as each step is scheduled/played), implemented by
  both the Web Audio and Tone.js engines and the fake engine used in tests.
- Surface the active step index to React (state or subscription) without
  causing audio-thread jank.
- Render a moving playhead column in `SequencerPanel` and flash the pads that
  fire on the active step.
- Highlight must stay in sync at different BPM and swing values, and clear when
  playback stops.
- Respect reduced-motion preferences for the flash animation.

## Acceptance criteria

- While the loop plays, the column for the current step is visibly marked and
  advances in time with the audio.
- Pads that trigger on the active step give a brief visual pulse.
- Stopping playback clears the playhead.
- The engine contract test covers that `onStep` fires once per step in order.
- No audible timing regression versus the current scheduler.
