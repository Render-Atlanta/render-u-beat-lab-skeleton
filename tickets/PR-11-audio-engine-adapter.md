# PR-11 - Audio engine adapter

**Type:** Architecture  
**Depends on:** PR-01

## Context

The current beat engine is a hand-built Web Audio implementation. Before adding
Tone.js or higher-quality sample playback, define a small app-facing audio
contract so the UI does not care which engine is underneath.

## Scope

- Define an `AudioEngine` interface for transport, pattern scheduling, tempo,
  swing, mute/solo-like lane controls if needed, and teardown.
- Wrap the existing Web Audio implementation as the first adapter.
- Keep beat pattern data serializable and separate from live audio nodes.
- Add unit tests for pure scheduling helpers and adapter lifecycle behavior.

## Acceptance criteria

- The app can still play, stop, change BPM, and change patterns through the
  adapter.
- Existing Web Audio behavior is preserved behind the interface.
- Tests cover scheduling math without needing real speakers or a browser mic.
- Future engines can be added without editing beat coach, style, or pattern
  modules.
