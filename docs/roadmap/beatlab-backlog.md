# Beat Lab — Roadmap / Backlog

Ideas captured from the FL Studio / GarageBand / open-source discussion
(2026-06-19). Filtered through the app's mission: **teach a beginner to make a
beat**. Pro-DAW surface area that doesn't serve that (automation lanes, VST
hosting, sidechain routing) is intentionally excluded.

Not committed — these are candidates to pull into future rounds. Verify a
library's current version/maintenance before adopting.

## High value (best fit for a beginner education tool)

| Idea | Inspiration | What it adds | Likely integration | Effort |
|------|-------------|--------------|--------------------|--------|
| **MIDI export** | FL / GB | Export the beat as a `.mid` so learners graduate it into a real DAW | `@tonejs/midi` | Low |
| **"Learn to Play" lessons** | GarageBand | Turn guided-mode one-liners into short checked-off multi-step lessons | extends existing guided mode + Beat Coach | Med |
| **Waveform view + onset markers** | FL Slicex | Legible UI for the song-upload (PR-39) + a future sample slicer | `wavesurfer.js` | Low–Med |
| **Drummer-style variations & fills** | GarageBand Drummer | "Make a variation / add a fill" within the current style profile | reuse `styleProfiles.generated.ts`; in-house | Med |

## Medium value

| Idea | Inspiration | What it adds | Likely integration | Effort |
|------|-------------|--------------|--------------------|--------|
| ~~**MIDI controller input**~~ ✅ | FL / GB | Shipped as a **MIDI** tool tab with Web MIDI opt-in, pad-note lane mapping, playhead-follow recording, manual step recording, and velocity-aware grid writes. | in-house Web MIDI | Med |
| **Piano-roll-lite** | FL piano roll | Scale-locked pitch editing for melody / 808 / bass guitar | in-house or NexusUI piano | Med |
| ~~**Groove / humanize**~~ ✅ | FL groove templates | Shipped as the **Humanize** button: seeded velocity dynamics (accent the pulse, ghost the in-between 16ths) via `beatVariation.humanizeGroove`. Timing-feel stays the Swing control. | extends `stepVelocities` | Low |
| ~~**FX sends (reverb/delay)**~~ ✅ | both | Shipped as beginner **Space** and **Echo** knobs with live Web Audio sends and deterministic WAV export rendering. | in-house | Low–Med |
| ~~**Per-channel kit selection**~~ ✅ | FL channel rack | Shipped a beginner **Kit** selector for Tone.js playback and deterministic WAV export with three in-repo CC0 kits: Classic, Punchy, and Airy. Kit choice persists through share URLs, autosave, undo/redo, and project JSON; per-lane browsing and `smplr` remain future sampled-instrument work. | in-house | Med |
| ~~**Robust music theory**~~ ✅ | — | Shipped an in-house beginner slice: key/scale chips in Piano Roll, corrected harmonic function coloring, and in-key transpose/root-reset controls for pitched lanes. Revisit `tonal` only if chord/key expansion outgrows these helpers. | in-house | Med |

## Analysis / infrastructure (from the audio-libraries discussion)

- **essentia.js** — WASM MIR: `RhythmExtractor2013` (BPM + beats + confidence),
  onset detection, key/chord. Would upgrade the PR-39 song-decompose accuracy
  (relevant to its Phase B go/no-go) and could subsume `onsetDetection.ts` +
  `tempoEstimation.ts`. Multi-MB WASM → lazy-load for the analysis feature only.
- **realtime-bpm-analyzer** (v5, maintained) — lighter focused BPM detection if
  full essentia is overkill. (Avoid `aubiojs` — effectively unmaintained.)
- **Consolidate on `Tone.Transport`** — collapse the custom `webAudioBeatEngine`
  scheduling into Tone's transport (already a dep), removing the dual-engine
  maintenance burden. Larger refactor.

## Tradeoffs to weigh before adopting sample/WASM libraries

- **Offline WAV export** (`styleRender.ts`) needs sample buffers preloaded
  locally; CDN-loaded soundfonts break deterministic export.
- **Bundle size** — essentia.js WASM and soundfonts are large; lazy-load.
- **Sample licensing** — prefer CC0 / open packs for anything bundled.
