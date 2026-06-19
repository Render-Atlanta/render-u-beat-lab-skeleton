# PR-23 - Instrument role coaching

**Type:** Feature
**Depends on:** PR-01
**Wave:** 1 (visual feedback)

## Context

The target user is a software builder with little or no musical background. They
can toggle grid cells but do not know *why* a kick, snare, or hat goes where it
does. Beginner tools teach the role of each sound one at a time before asking
the user to combine them.

This is a low-effort, high-learning-value change: attach a plain-English role
to each lane and make it discoverable next to the grid.

Research basis: teach one role at a time; embed guidance so non-musicians know
where to start (Ableton Learning Music, Hookpad design intent).

## Scope

- Extend the instrument metadata (`instruments.ts`) with a short role label and
  a one-line plain-English explanation per lane:
  - Kick = the pulse / foundation (usually on the downbeats).
  - Snare = the backbeat (usually on 2 and 4).
  - Hat = the subdivision / timekeeping (the fast ticks between hits).
  - Open hat = accent / lift.
- Show the role inline in the sequencer track label (e.g. tooltip, helper text,
  or expandable hint) without crowding the grid.
- Keep copy beginner-first and consistent with the existing Beat Coach voice.

## Acceptance criteria

- Each lane exposes its role and a one-line explanation in the UI.
- Copy is data-driven (no hard-coded strings scattered in the component).
- Adding a future instrument lane only requires adding its metadata.
- Layout stays readable on mobile widths.
