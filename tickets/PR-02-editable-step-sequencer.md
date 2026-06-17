# PR-02 - Editable step sequencer

**Type:** Feature  
**Depends on:** PR-01

## Scope

- Make every grid cell togglable.
- Add BPM control with min/max guardrails.
- Add swing control with clear range labeling.
- Add reset-to-style button.
- Serialize current pattern into URL state.

## Acceptance criteria

- Toggling a cell changes the next loop pass.
- BPM and swing changes are audible without restarting the app.
- URL state can recreate a pattern after reload.
- Tests cover serialization and style reset behavior.
