# PR-28 - In-key melody lane

**Type:** Feature
**Depends on:** PR-27
**Wave:** 3 (more instruments, scaffolded)

## Context

A melody is where non-musicians get lost. The proven fix (Hookpad) is to embed
theory as guardrails: default to only the notes in the song's key, color-code
notes by function, and guide the user toward notes that fit. A software builder
should be able to make something that sounds intentional without knowing
theory.

Research basis: Hookpad shows "only the notes and chords in the song's key,
coloring each note to denote its musical function" specifically because
"beginners often don't know where to start."

## Scope

- Add a melodic lane (simple synth/sample) addressing a small pitch set rather
  than a single drum trigger.
- Constrain the available pitches to the current style's key/scale by default
  (in-key palette); a beginner cannot pick an obviously "wrong" note.
- Color-code or label notes so their role is visible (e.g. root vs other scale
  tones).
- Represent the melody in pattern state with pitch-per-step, serialized and
  shareable, and rendered by the engine in sync with the drums.
- Keep the UI scaffolded: the melody lane is opt-in and introduced as its own
  layer, not forced into every preset.

## Acceptance criteria

- User can place in-key melody notes on the grid and hear them with the beat.
- Only in-key pitches are offered by default for the selected style.
- Note function is visually distinguishable.
- Melody (pitch-per-step) round-trips through pattern state and export.
- Deterministic tests cover the in-key constraint and serialization.
