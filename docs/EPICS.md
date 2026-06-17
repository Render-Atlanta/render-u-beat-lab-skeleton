# Epics

## Epic 1 - Playable beat machine

Goal: make the app immediately rewarding. A user should hear something in under
ten seconds.

Tickets: PR-01, PR-02

## Epic 2 - Beat literacy for non-producers

Goal: teach rhythm through the interface so the instructor does not need deep
producer vocabulary.

Tickets: PR-03

## Epic 3 - Capture real-world rhythm

Goal: turn table taps and beatboxing into a cleaned-up grid pattern.

Tickets: PR-04, PR-05, PR-06

## Epic 4 - Producer polish

Goal: make the output feel memorable and shareable.

Tickets: PR-07, PR-08

## Epic 5 - Workshop delivery

Goal: make the project deployable, teachable, and agent-friendly.

Tickets: PR-09, PR-10

## Epic 6 - Higher-quality sound integrations

Goal: improve musical quality by isolating the audio engine, then testing
Tone.js, licensed samples, Meyda feature extraction, and optional offline
reference analysis.

Tickets: PR-11, PR-12, PR-13, PR-14, PR-15

## Epic 7 - Code quality and test hygiene

Goal: keep the workshop code small, composable, and easy to inspect by moving
logic into focused modules with clear tests and guardrails.

Tickets: PR-16, PR-17, PR-18, PR-19, PR-20

## MVP recommendation

For the next workshop, target PR-01 through PR-05. That gives you a complete arc:

1. Start from a working beat.
2. Explain the grid.
3. Capture table taps.
4. Quantize them.
5. Show how reusable AI workflows helped build each slice.

Beatbox lane classification and producer polish are excellent stretch goals, but
they should not block the core lesson.

## Next prototype recommendation

For the sound-quality phase, start with PR-11 and PR-12. That gives the project a
clean engine seam and a testable Tone.js sample playback spike before committing
to a full sample library. PR-16 and PR-17 can run in parallel because they reduce
UI and domain complexity without changing the musical feature set.
