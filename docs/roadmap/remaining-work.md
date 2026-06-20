# Beat Lab — Remaining Work

Snapshot as of 2026-06-20, after the brief-fidelity + bass-guitar round
(PR-A beat ruler #94, PR-B guided mode #96, PR-C bass guitar #97 — all merged),
plus a follow-up round: bass-guitar drag-paint fix + MIDI export (branch
`feat/midi-export`).

## A. Near-term follow-ups (small, from the recent rounds)

- [ ] **Fill the PR-39 spike findings doc** (`docs/spikes/PR-39-song-decompose-findings.md`).
      Run `npm run dev`, open with `?songlab=1`, drop in real tracks, and record
      BPM accuracy + kick/snare/hat separation. This is the **go/no-go input for
      PR-39 Phase B** — it's a human-audition task (the AI can't judge audio).
- [x] ~~**Sync the primary checkout.**~~ Done — fast-forwarded to `origin/main`
      (through #98). Picked up the bass-guitar round + this doc.
- [x] ~~**Surface bass-guitar in more coach copy (optional polish).**~~ Audited the
      coach/guided/style surfaces: per-instrument copy, labels, ordering, and
      guided sequence all already cover Bass Gtr, and the style "feel notes" are
      drum-pocket prose by design (no lane inventory to update). The audit turned
      up a real bug instead — `useStepPaint` left bass guitar out of its pitched-
      lane guard, so drag-paint was wrongly active on it. Fixed by reusing the
      canonical `isPitchedLane`, with a regression test.
- [x] ~~Fix the round spec's PR-C drift (said smplr; shipped synth).~~ Done.

## B. PR-39 Phase B — Song decompose (GATED on the findings doc above)

Only build if the spike findings justify it:
- [ ] "Recreate" path beyond the minimal "Load into grid" — full editable flow.
- [ ] **Sample-slicing path**: slice uploaded audio at onsets into per-hit one-shots
      assignable to lanes.
- [ ] BPM / downbeat **correction controls** + re-quantize.
- [ ] Polished, always-on upload UX (remove the `?songlab=1` dev gate).

## C. Roadmap / backlog (full list in `docs/roadmap/beatlab-backlog.md`)

DAW-inspired features + integrations, filtered for a beginner education tool.
Top picks:
- [x] ~~**MIDI export** — let learners take a beat into a real DAW.~~ Shipped as
      "Download MIDI". Used an in-house Standard MIDI File writer/reader
      (`midiFile.ts` + `midiReader.ts` + `exportMidi.ts`) rather than
      `@tonejs/midi`, which is ~4 years stale (last publish 2022-04) and pulls in
      two transitive deps; the format is frozen, so there's nothing to maintain.
- [x] ~~**"Learn to Play" lessons** — turn guided-mode one-liners into multi-step lessons.~~
      Shipped as a **Lessons** tab (`lessons.ts` + `LessonsPanel`): 3 hands-on
      lessons (first beat → bounce → feel) whose steps check themselves off live
      as you build on the grid (pure predicates over `SequencerState`). The
      "feel" lesson reinforces the Vary/Fill/Humanize/Swing controls. Active
      lesson persists via `lessonPrefs`; progress is derived live.
- [x] ~~**Piano-roll-lite** — a grid note-editor for the pitched lanes.~~ Shipped
      as the **Piano Roll** tool tab (`pianoRoll.ts` + `PianoRollPanel`): a
      7-degree × 16-step grid per focused lane (808 / Bass Gtr / Melody), click
      to place / move / clear a note. In-house, no new deps, zero engine
      changes; shares state with the main grid + autosave + share URLs via
      `setSequencerPitchedStepNote` / `clearSequencerPitchedStep` (one undo
      entry each, exhaustive over the pitched lanes). The review also surfaced
      and fixed a pre-existing undo bug — the history snapshot omitted
      `bassGuitarStepPitches`, so Bass Gtr pitch moves couldn't be undone.
- [ ] **Waveform view + onset markers** (`wavesurfer.js`) — for the upload/sample features.
- [x] ~~**Drummer-style variations & fills** — perturb the current pocket within its style profile.~~
      Shipped as the **Vary** / **Fill** buttons (`beatVariation.ts` + seeded
      `seededRng.ts`). Variation flips hat movement + an occasional syncopated
      kick while preserving the backbeat, downbeat pulse, and melodic lanes;
      Fill adds a style-aware last-beat roll (hat vs snare) with an open-hat
      lead-in. Deterministic + unit-tested; applied via `applySequencerState`
      so undo/redo and autosave come free.
- [x] ~~**Groove / humanize**~~ — shipped as the **Humanize** button (`humanizeGroove`):
      seeded velocity dynamics (accent the pulse, ghost the in-between 16ths),
      drums only; timing-feel stays the Swing control. Reuses `seededRng` and
      the `applyDrummerAction` helper from the Vary/Fill round.
- [ ] Still open: MIDI controller input, FX sends, kit selection (`smplr`), music theory (`tonal`).
- [ ] **Analysis upgrade**: `essentia.js` (robust BPM/beat/key) could raise PR-39 accuracy.
- [ ] **Sampled / realistic instruments** (incl. the parked sampled bass via `smplr`/soundfonts)
      — requires solving offline/OfflineAudioContext sample rendering first, since
      all audio + WAV export is currently synthesis-only.
- [ ] Infra: consolidate scheduling on `Tone.Transport` (retire the custom engine's duplicate logic).

## D. Parallel track — AI beat commands (separate workstream)

A concurrent effort shipped **Plan 1** (deterministic NL command bar) on `main`.
- [ ] **Plan 2**: Gemini endpoints + voice input (per its own plan/spec docs). Not
      part of this round; tracked here for visibility.
