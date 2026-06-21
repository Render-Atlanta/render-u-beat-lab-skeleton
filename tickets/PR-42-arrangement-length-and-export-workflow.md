# PR-42 - Arrangement length and export workflow

**Type:** Feature
**Depends on:** PR-08, PR-26, PR-32
**Wave:** 5 (Workshop readiness)
**Related:** PR-34 (share/autosave), PR-40 (mobile layout)
**Source:** Codex workshop audit, 2026-06-21

## Context

The sequencer is intentionally a 16-step, one-bar pattern. Export currently
renders two loops, and the arrangement model has four one-bar sections. For the
workshop, the natural next request is to make the beat feel longer than one bar,
especially when adding a producer tag.

The existing Arrangement panel shows sections and lane mutes, but it does not
let users edit section bar counts, preview the full arrangement length, or export
the arrangement as arranged. Export actions are also far below the fold in the
rail tool panel.

## Scope

- Add editable bar counts per arrangement section, with safe min/max limits.
- Show a concise total length summary, for example `4 bars / ~6.8 seconds`.
- Make WAV and MIDI export render the arrangement sections instead of a fixed
  `loops: 2` one-bar repeat.
- Include producer tag placement in arrangement export:
  - intro: once at the start,
  - loop: per section or per configured repeat,
  - manual: not exported unless explicitly requested.
- Move or duplicate primary export actions so they are visible near the top of
  the Arrange tool.
- Add tests for arrangement duration, section rendering, and tag offsets across
  multi-section exports.

## Acceptance criteria

- A user can create an 8-bar beat using the existing one-bar grid plus
  arrangement controls.
- Exported WAV and MIDI lengths match the arrangement summary.
- Section lane mutes affect exported audio/MIDI.
- Producer tag export behavior is documented in the UI and covered by tests.
- The Arrange panel remains usable in rail, focus, and mobile layouts.

