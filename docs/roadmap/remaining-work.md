# Beat Lab — Remaining Work

Snapshot as of 2026-06-20, after the brief-fidelity + bass-guitar round
(PR-A beat ruler #94, PR-B guided mode #96, PR-C bass guitar #97 — all merged).

## A. Near-term follow-ups (small, from the recent rounds)

- [ ] **Fill the PR-39 spike findings doc** (`docs/spikes/PR-39-song-decompose-findings.md`).
      Run `npm run dev`, open with `?songlab=1`, drop in real tracks, and record
      BPM accuracy + kick/snare/hat separation. This is the **go/no-go input for
      PR-39 Phase B** — it's a human-audition task (the AI can't judge audio).
- [ ] **Sync the primary checkout.** `/Users/.../render-u-beat-lab` is a few
      commits behind `origin/main` (left alone during the concurrent
      `ai-beat-commands` work). A `git pull` when convenient.
- [ ] **Surface bass-guitar in more coach copy (optional polish).** The Beat Coach
      per-instrument summary now includes Bass Gtr; double-check other coach
      surfaces (style notes, guided tips) read well with the new lane.
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
- [ ] **MIDI export** (`@tonejs/midi`) — let learners take a beat into a real DAW.
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
