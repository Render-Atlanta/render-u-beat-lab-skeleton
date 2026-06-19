# PR-27 - Curated extra instruments (clap + 808)

**Type:** Feature
**Depends on:** PR-02, PR-11
**Wave:** 3 (more instruments, scaffolded)

## Context

Users want more than kick/snare/hat/open-hat. The research caution is explicit:
Groove Pizza *cut* drum tracks from five to three to "eliminate option
paralysis." So we add a small, curated set — not a long list — that maps to how
beginners actually build a beat: a clap to thicken the backbeat and an 808 for
low-end melody/weight.

## Scope

- Add two new lanes with synthesized (and, where available, sampled) voices:
  - Clap — layered noise burst, typically doubling the snare backbeat.
  - 808 — a tuned sub-bass hit; this is the app's **bass** for now (single
    default pitch in this ticket). Per-step pitch selection — turning it into a
    playable "bass guitar" line — is the follow-up PR-31, which reuses PR-28's
    in-key pitch mechanism.
- Extend the instrument metadata so the new lanes carry their role copy
  (PR-23 pattern) and appear in the grid, patterns, style presets, and pattern
  state / URL serialization.
- Provide tasteful defaults in each style preset so the new lanes are useful
  immediately (manipulate-pre-made-first principle), and keep them togglable.
- Ensure beatbox/tap capture and existing tests still account for lane set
  changes (extend lane lists rather than hard-code four).

## Acceptance criteria

- Clap and 808 lanes appear in the sequencer and play correctly at all steps.
- Style presets include sensible default placements for the new lanes.
- Pattern state (incl. URL share) round-trips with the new lanes.
- The lane set remains deliberately small; no open-ended instrument list.
- Existing pattern/engine tests are updated and passing.
