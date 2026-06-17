# PR-12 - Tone.js sample engine spike

**Type:** Spike  
**Depends on:** PR-11

## Context

Tone.js provides DAW-like transport, timing, players, samplers, effects, and
browser-safe audio primitives. A sample-based Tone.js engine is the fastest path
to making the beats sound closer to real production without writing a full audio
framework from scratch.

References:

- Tone.js docs: https://tonejs.github.io/
- Tone.js GitHub: https://github.com/Tonejs/Tone.js

## Scope

- Add Tone.js as an optional engine behind the `AudioEngine` interface.
- Schedule the existing 16-step patterns with `Tone.Transport` or equivalent
  Tone timing primitives.
- Play kick, snare, closed hat, and open hat through sample players.
- Add a small engine toggle or developer switch so we can compare current Web
  Audio synthesis against Tone sample playback.

## Acceptance criteria

- A user can play at least one existing style through the Tone engine.
- The Tone engine respects BPM, swing, play/stop, and pattern edits.
- Browser audio unlock is handled through a user gesture.
- The spike documents whether Tone.js should replace or coexist with the
  current engine.
