# PR-16 - App component decomposition

**Type:** Quality  
**Depends on:** PR-03, PR-06, PR-08

## Context

`App.tsx` is carrying too many responsibilities as the prototype grows. Split it
into focused UI components before adding more audio integrations, reference
profiles, and teaching controls.

## Scope

- Extract focused components for style selection, transport controls, step
  sequencer, beat coach, reference tracks, beatbox capture, and export controls.
- Keep state ownership explicit and avoid prop chains that hide behavior.
- Preserve the existing visual design system and responsive behavior.
- Add component-level tests where interaction risk is high.

## Acceptance criteria

- `App.tsx` is mostly orchestration and state wiring.
- Extracted components have clear prop types and no hidden global state.
- Existing tests still pass, and at least one newly extracted component has a
  focused interaction test.
- The UI looks and behaves the same after the split.
