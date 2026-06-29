# Open-source sampled instrument sounds — design

**Issue:** #122 (`tickets/PR-46-open-source-instrument-sounds.md`)
**Status:** Approved design, pre-implementation
**Date:** 2026-06-29

## Goal

Give beat makers GarageBand/FL-style realistic instrument sounds — real grand
piano, Rhodes, strings, electric/upright bass, an acoustic drum kit — sourced
from license-clean open-source samples, without regressing the instant-load,
synthesis-only experience that exists today.

## Background: two independent audio paths

The app synthesizes everything today, across **two separate implementations**:

1. **Live playback** — Tone.js voices in `src/audio/toneRuntime.ts` /
   `src/audio/toneVoices.ts`. Drum lanes use sample players over the CC0 kit;
   the pitched lanes (`melody`, `bassGuitar`, `808`) are `Tone.Synth`s triggered
   by note name via `triggerAttackRelease(noteName, dur, time, accent)`.
2. **WAV export** — does **not** use Tone.js. `src/lib/styleRender.ts`
   (`renderPatternToPcm`) re-synthesizes the pitched lanes with pure-math PCM
   functions (`synthesizeMelodyNotePcm`, `synthesizeBassNotePcm`,
   `synthesizeBassGuitarNotePcm`) and mixes decoded kit PCM (`DecodedKit`) for
   drums.

Consequence: a realistic instrument must be solved twice — a `Tone.Sampler` for
live, and offline sample-decode + pitch-shift for export. The offline half is
the expensive part and is **deferred** (see Scope).

## Scope (v1)

- **Sounds:** sampled voices for the melodic lanes (`melody`, `bassGuitar`) and a
  sampled drum kit. `808` stays synthesized (it is a sub-bass; synthesis is the
  right tool). Optional "Sampled 808" can be added later.
- **Selection:** a small, curated **per-lane sound picker**. The synth/existing
  kit stays the **default** for every lane — no change to default sound.
- **Loading:** sampled voices are **lazy-loaded only when selected**, so initial
  page load is unchanged.
- **Playback only:** realistic sounds play in **live playback**. The exported WAV
  continues to use today's synth PCM / existing kit. This gap is intentional and
  documented; export parity is a separate fast-follow PR.

### Out of scope (v1)

- Export parity (offline decode + pitch-shift/resample in `styleRender.ts`).
- Any full General-MIDI instrument browser (avoids the option-paralysis caution
  from PR-27).
- Changing the default sound of any lane.

## Curated voices

Default is listed first; it is the existing synth/kit and always present.

- **Melody:** Synth *(default)* · Grand Piano · Rhodes · Strings
- **Bass (`bassGuitar`):** Synth *(default)* · Electric Bass · Upright Bass
- **808:** synth only (unchanged)
- **Drum kit:** `classic` / `punchy` / `airy` *(default set)* · one sampled
  "Acoustic" kit

The list is deliberately short. Adding a voice is a manifest entry plus assets,
not a code change, so the set can grow later.

## Source & licensing

- **Primary source:** VCSL (Versilian Community Sample Library), **CC0** — no
  attribution burden, bundleable.
- Fallback if footprint becomes a problem: GeneralUser GS (free, commercial-OK).
- Every bundled instrument records its source + license in a manifest, mirroring
  the PR-13 kit license notes and the `OPEN_REFERENCES` convention (PR-21).

## Asset pipeline (chosen approach)

**Per-note WAV/MP3 assets in `/public` played by `Tone.Sampler`.**

- A `scripts/` extractor pulls a sparse set of notes per instrument (e.g. one
  every 3–4 semitones) from a local VCSL checkout into
  `/public/instruments/<instrument>/<note>.<ext>`. `Tone.Sampler` interpolates
  the gaps between recorded notes.
- A generated manifest maps each voice id → `{ noteName: url }` plus source and
  license metadata.

Rationale: reuses the existing `/public/kit/` convention, adds **no new runtime
dependency**, and is Tone-native. Rejected alternatives: shipping `.sf2` +
runtime soundfont parser (new dep, larger download, second playback path) and
build-time synthesis (defeats the purpose — we want real recordings).

## Architecture / integration points

1. **Asset extractor + manifest** — `scripts/generate-instruments.ts` (or
   similar) produces `/public/instruments/...` and a generated manifest module
   with per-voice URL maps + license. Pattern follows `scripts/generate-kit.ts`
   and `src/audio/sampleKit.ts`.
2. **`instrumentVoices` module** (new) — single source of truth describing the
   available voices per lane: `{ id, label, lane, sampleUrls, source, license }`.
   Both the UI and the engine read from it.
3. **Engine** — add `createSamplerVoice(urlMap, destination)` to
   `toneRuntime.ts` returning a `Tone.Sampler` adapted to `ToneVoicePort`.
   Because pitched lanes already call `triggerAttackRelease(noteName, …)`, the
   sampler is a near drop-in for the synth voice in `toneVoices.ts`. On load
   failure it falls back to the synth voice (existing
   `createSampleVoiceWithFallback` pattern).
4. **State** — add a `laneVoices` selection map to `SequencerState`
   (`src/lib/patternState.ts`), serialized into the URL share params alongside
   `sampleKitId` so selections round-trip.
5. **UI** — a small per-lane voice dropdown in the sequencer controls, following
   the existing sample-kit selector component.

## Testing

- Voice-manifest shape + license coverage (every voice has a source + license).
- `SequencerState` round-trip including `laneVoices` (incl. URL share params).
- Sampler voice falls back to the synth voice on sample load error.
- UI selection wiring updates the active voice.
- Existing pattern/engine/export tests remain green (export output unchanged in
  v1).

## Delivery / risk notes

- Bundle-size budget: only the curated sparse note set ships; document the total
  added asset size and keep it within static-hosting limits.
- Build on a **fresh branch off clean `origin/main`** (worktree) — local `main`
  carries uncommitted redesign + PR-45 work that should not be entangled with
  this feature.

## Follow-up PRs

- **Export parity:** teach `styleRender.ts` to decode + pitch-shift the sampled
  voices into the offline PCM render so exports match live playback.
- Optional: sampled 808, additional curated voices, sampled drum kit variants.
