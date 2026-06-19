# PR-29 - Guided "build it up" layering mode

**Type:** Teaching
**Depends on:** PR-23, PR-27
**Wave:** 3 (more instruments, scaffolded)

## Context

The most consistent finding across beginner tools is scaffolding: teach one
layer at a time, progress from manipulating pre-made content to authoring it,
and combine layers in a synced playground only after each is understood. With
more instruments available (PR-27/PR-28), a blank multi-lane grid risks the
exact option-paralysis the research warns against. A guided mode sequences the
build so an absolute beginner is never staring at everything at once.

Research basis: scaffolded, one-concept-at-a-time progression and
"learn each instrument, then combine" (Ableton Learning Music Playground);
deliberate option reduction (Groove Pizza).

## Scope

- Add an optional guided mode that introduces lanes in order (e.g. kick →
  snare → hat → clap/808 → melody), enabling one layer at a time with a
  short prompt explaining its role (reuse PR-23 copy).
- Let the user advance/skip steps and exit to the full free-form grid at any
  time (no lock-in; experts can ignore it).
- Persist whether the user prefers guided or free mode.
- Keep it data-driven so new lanes slot into the sequence via metadata.

## Acceptance criteria

- A first-time / opted-in user is walked through enabling layers one at a time
  with role explanations.
- The user can exit to the full grid at any point and re-enter guided mode.
- Free-form behavior is unchanged when guided mode is off.
- The layer sequence is defined in data, not hard-coded UI branches.
