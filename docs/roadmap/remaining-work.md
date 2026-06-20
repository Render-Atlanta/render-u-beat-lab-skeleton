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
- [ ] **"Learn to Play" lessons** — turn guided-mode one-liners into multi-step lessons.
- [ ] **Waveform view + onset markers** (`wavesurfer.js`) — for the upload/sample features.
- [ ] **Drummer-style variations & fills** — perturb the current pocket within its style profile.
- [ ] MIDI controller input, piano-roll-lite, groove/humanize, FX sends, kit selection (`smplr`), music theory (`tonal`).
- [ ] **Analysis upgrade**: `essentia.js` (robust BPM/beat/key) could raise PR-39 accuracy.
- [ ] **Sampled / realistic instruments** (incl. the parked sampled bass via `smplr`/soundfonts)
      — requires solving offline/OfflineAudioContext sample rendering first, since
      all audio + WAV export is currently synthesis-only.
- [ ] Infra: consolidate scheduling on `Tone.Transport` (retire the custom engine's duplicate logic).

## D. Parallel track — AI beat commands (separate workstream)

A concurrent effort shipped **Plan 1** (deterministic NL command bar) on `main`.
- [ ] **Plan 2**: Gemini endpoints + voice input (per its own plan/spec docs). Not
      part of this round; tracked here for visibility.
