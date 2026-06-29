# PR-46 - Open-source sampled instrument sounds

**Type:** Feature
**Depends on:** PR-11 (audio engine adapter), PR-12 (Tone.js sample engine), PR-13 (licensed kit + manifest), PR-21 (open-licensed references)

## Context

Today every voice is synthesized — the drum kit is deterministic CC0 synthesis
and the 808 / bass guitar / melody lanes are Tone.js synths (see the
synthesis-only constraint). That ceilings how "real" the app can sound. Users
expect the GarageBand/FL Studio experience: a real grand piano, a Rhodes, an
electric bass, a string section. There is a rich open-source ecosystem of
license-clean sampled instruments we can pull from; the work is integration and
the offline-render export path, not licensing.

This ticket adds a curated set of permissively licensed **sampled** instrument
voices and the infrastructure to play and export them, alongside the existing
synth voices.

## Recommended sources (license-clean)

Prefer CC0 / permissive so we can bundle with no attribution friction. Skip
Philharmonia (redistribution terms) and Freesound CC-BY-NC packs for bundling.

| Source | License | Use |
| --- | --- | --- |
| **VCSL** (Versilian Community Sample Library) | CC0 | Primary multi-instrument bank (~190 real instruments) |
| **GeneralUser GS** | Free, commercial-OK, no attribution required | Compact full GM bank (~30MB) if size matters |
| **MuseScore_General / FluidR3_GM** | MIT | Alternative full GM banks, browser-tested |
| **Salamander Grand Piano** | CC-BY 3.0 | High-quality single piano (needs attribution) |
| **Sonatina Symphonic Orchestra** | CC Sampling Plus | Orchestral sections |

Default recommendation: **VCSL (CC0)** as the bundled source, with
**GeneralUser GS** as the fallback if bundle size becomes a problem.

## Scope

- Select a small, curated set of sampled instruments (not the whole GM bank) —
  e.g. acoustic piano, electric piano/Rhodes, electric bass, strings/pad. Keep
  the deliberately-small-lane-set principle (PR-27).
- Add sampled voices to the audio engine using `Tone.Sampler` (or a soundfont
  player such as smplr / spessasynth for `.sf2`), wired alongside the existing
  synth voices in `src/audio/toneVoices.ts` and the instrument metadata in
  `src/lib/instruments.ts`.
- **Make sampled voices render in the offline WAV-export path.** This is the
  crux: the export uses an `OfflineAudioContext`, so sample buffers must be
  loaded before render or exports come out silent. Decide and document the
  buffer-loading strategy for offline render.
- Decide the delivery model: bundle samples vs. lazy-load on first use; document
  the bundle-size budget for static Render hosting.
- Add a sample/source manifest with per-instrument license + attribution (extend
  the PR-13 manifest pattern), and record sources via the `OPEN_REFERENCES` /
  kit-credits convention (PR-21).
- Add loading states and graceful fallback to the synth voice if a sampled
  instrument fails to load (PR-13 pattern).
- Optionally expose a "realistic vs. synth" choice so the lighter synth path
  stays available for low-bandwidth / instant playback.

## Acceptance criteria

- At least one curated set of sampled instruments plays correctly in the
  sequencer across all pitches/steps.
- Sampled voices are present and correct in the **offline WAV export** (not just
  live playback) — exported audio matches what is heard.
- Every bundled sample/source has documented license + attribution in the repo.
- The app loads sampled instruments in a production build with no console errors;
  failures fall back to the synth voice without breaking playback.
- Bundle size stays within a documented budget for static hosting.
- Pattern state (incl. URL share) round-trips with any new instrument selection.
- Existing pattern/engine/export tests are updated and passing; new tests cover
  the manifest shape and the offline-render path for a sampled voice.

## Shipped in v1 (live playback)

- Per-lane voice picker for **melody** and **bass guitar** (Synth default; Grand Piano, Rhodes, Strings, Electric Bass, Upright Bass).
- `Tone.Sampler` voices in the Tone.js engine with synth fallback on load failure.
- Lazy-loaded sparse multisamples from `public/instruments/` (VCSL CC0, 38 WAVs, **~2.2 MB** total).
- **Acoustic** drum kit option via existing Kit dropdown (`public/kit/acoustic/`, **~120 KB**).
- `laneVoices` persisted in sequencer state and share URL (`voices` param).
- License files: `public/instruments/LICENSE.md`, updated `public/kit/LICENSE.md`.
- Extraction scripts: `scripts/extract-vcsl-instruments.sh`, `scripts/extract-vcsl-acoustic-kit.sh`.

## Deferred to export-parity PR

- Offline WAV export (`styleRender.ts` / `exportBeat.ts`) still uses synth-only voices — exported audio is unchanged when voices are synth-default.
- Sampled voices in export require pre-loading buffers into `OfflineAudioContext` before render.
- Loading UI / progress for large sample maps (live path loads silently via Tone.js today).
