# PR-31 - Pitched bass (notes on the 808 lane)

**Type:** Feature
**Depends on:** PR-27 (808 lane), PR-28 (in-key per-step pitch mechanism)
**Wave:** 3 (more instruments, scaffolded)

## Context

PR-27 ships the 808 as a single tuned sub-bass *hit* — enough to give a beat
low-end weight, but not a "bass guitar" the user can write a line with. This
ticket is the "add notes later" follow-up: let the user pick a pitch per step on
the bass lane so they can play an actual bassline, while keeping it
beginner-safe by constraining pitches to the song's key (the same in-key
guardrail PR-28 builds for melody — beginners can't pick an obviously wrong
note).

Scope it as: the bass becomes a pitched voice that reuses PR-28's in-key
pitch-per-step model, with a low-register, plucky bass-guitar-ish timbre rather
than the melody timbre.

## Scope

- Give the bass/808 lane a pitch-per-step representation (reuse PR-28's in-key
  palette + per-step pitch state and serialization rather than inventing a new
  one); default to the key's root so existing 808 patterns keep sounding the
  same until the user changes notes.
- Add a bass-guitar-leaning voice (synth and, where available, sampled) in a low
  octave; the timbre should read as "bass," distinct from the melody lane.
- UI: let the user set the note for an active bass step (in-key only by
  default), color-coded by function like PR-28; keep the lane togglable and the
  interaction discoverable for non-musicians.
- Serialize bass pitch-per-step through pattern/URL state and project JSON, with
  a backward-compat default (older 808 patterns with no pitch load at the root).
- Honor lane volume (PR-30) and include the pitched bass in the WAV export.

## Acceptance criteria

- The user can place in-key bass notes per step and hear a bass-guitar-style
  line in sync with the drums.
- Only in-key pitches are offered by default for the selected style.
- Bass pitch-per-step round-trips through state/URL/JSON; pre-PR-31 808
  patterns load at the root note without error.
- The pitched bass is present in the WAV export and respects its lane volume.
- Deterministic tests cover the in-key constraint, pitch serialization +
  backward-compat default, and render inclusion.
