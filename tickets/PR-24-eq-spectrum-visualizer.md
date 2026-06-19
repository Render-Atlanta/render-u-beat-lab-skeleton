# PR-24 - EQ / spectrum visualizer

**Type:** Feature
**Depends on:** PR-11
**Wave:** 1 (visual feedback)

## Context

An equalizer-style frequency display gives beginners a visual handle on
"where each sound lives" — kicks are low bars, hats are high bars — reinforcing
the instrument-role lesson with live feedback. This is a documented, low-effort
Web Audio pattern.

Research basis: MDN's `AnalyserNode` → canvas frequency-bar visualizer
(`getByteFrequencyData`, one bar per bin, height ∝ magnitude). Practical note:
most energy sits in the lower bins, so scale bar width / use a log-ish mapping
so high-frequency bars are not empty.

References:

- MDN Visualizations with Web Audio API:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

## Scope

- Add an `AnalyserNode` tapped off the master gain in the Web Audio engine (and
  an equivalent tap for the Tone.js engine) without altering the audible
  signal.
- Expose the analyser (or a frame-data accessor) through the engine so a React
  component can read frequency data on an animation frame loop.
- Render a canvas spectrum/EQ meter that animates while the loop plays and goes
  idle when stopped.
- Use a frequency mapping that keeps high bins visible (not a raw linear bin
  dump).
- Respect reduced-motion (render a static/low-rate fallback).

## Acceptance criteria

- A live frequency bar display animates in time with playback.
- The visualizer does not change what the user hears.
- Low/high content is visually distinguishable (kick vs hat read differently).
- Component cleans up its animation frame loop on unmount / stop.
