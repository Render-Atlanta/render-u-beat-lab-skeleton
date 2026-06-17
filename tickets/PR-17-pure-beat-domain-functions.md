# PR-17 - Pure beat domain functions

**Type:** Quality  
**Depends on:** PR-02, PR-03

## Context

Pattern editing, style presets, reference profiles, and beat coach summaries
should be easy to test without rendering React or starting audio. Move domain
logic into small pure functions with narrow inputs and outputs.

## Scope

- Audit pattern, style, reference, and coaching modules for logic embedded in UI
  handlers.
- Extract reusable pure functions for pattern transforms, density summaries,
  reference metadata formatting, and style-derived defaults.
- Add tests for edge cases such as empty patterns, dense patterns, odd BPMs, and
  unsupported style IDs.
- Keep function names plain enough to teach during the workshop.

## Acceptance criteria

- Core beat and coaching behavior can be tested without the DOM or Web Audio.
- New pure functions have focused tests covering normal and edge cases.
- No extracted function mutates caller-owned pattern arrays.
- The workshop can point to at least three small functions as examples of good
  AI-friendly refactoring.
