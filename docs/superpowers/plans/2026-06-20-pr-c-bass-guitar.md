# PR-C — Bass Guitar Lane (synth electric bass)

**Status:** Implemented. Part of the brief-fidelity + bass round (PR-A beat ruler,
PR-B guided mode, PR-C bass guitar). Design spec:
`docs/superpowers/specs/2026-06-19-beatlab-brief-fidelity-and-bass-design.md`.

## What this adds

A new **pitched `bassGuitar` lane** — a synthesized electric bass that sits an
octave above the `808` sub, distinct in both register and timbre. Voiced as a
plucked, filtered sawtooth (fast attack, short decay) across all three render
paths so live playback and WAV export match.

Decision (locked with the user after the audio-architecture map): the whole
engine + export pipeline is **synthesis-only**, so the bass guitar is a synth
voice mirroring the `808`/`melody` pattern rather than a sampled `smplr`
instrument. See memory `audio-is-synthesis-only`.

## Key design points

- **Lane order:** `bassGuitar` inserted after `808`, before `melody` (guided
  mode flows …808 → bassGuitar → melody).
- **Register:** `BASS_GUITAR_REGISTER_OFFSET = 36` (808 = 24, melody = 48).
- **Pitch module:** new `src/lib/bassGuitarPitch.ts` holds all bass-guitar pitch
  + synth logic (kept out of `stepPitch.ts`, which was at the 300-line limit).
  Mirrors the bass helpers: palette, defaults, clone, normalize, update,
  pitch-for-step, serialize/deserialize, and `synthesizeBassGuitarNotePcm`.
- **Default content:** each style's `bassGuitar` row is the **root-note bassline
  derived from its `808` steps** — every pocket ships a playable bassline,
  fully editable.
- **Backward compatibility:** added a `SEVEN_LANE_ORDER` fallback in
  `deserializePattern` (old 7-row share links still load), and arrangement /
  URL parsing default the new field when absent (old saved projects still load).
- **Synth-only kit:** `bassGuitar` (like `melody`) is excluded from
  `SampleKitLane` / `DecodedKit` — no kit sample required.

## Files touched (synth voice mirrors the 808 across every path)

- New: `src/lib/bassGuitarPitch.ts` (+ test), `src/components/StepPitchSelect.tsx`.
- Types/state: `patterns.ts`, `patternState.ts`, `beatStyles.ts` (9 styles),
  `sequencerDomain.ts`, `arrangement.ts`, `instruments.ts`, `beatCoach.ts`.
- Audio: `audio/webAudioBeatEngine.ts` (`playBassGuitar`), `audio/transport.ts`
  (pitch lookup), `audio/toneVoices.ts` (pitched dispatch),
  `audio/toneRuntime.ts` (`createBassGuitarSynth`),
  `audio/toneSampleBeatEngine.ts` (port), `audio/sampleKit.ts`.
- Export: `lib/styleRender.ts` (bass-guitar synth render block),
  `lib/loadKit.node.ts` / `lib/loadKit.browser.ts`.
- UI: `components/SequencerPanel.tsx` (pitched-lane lookup + `StepPitchSelect`
  extraction to stay under the 300-line limit), `App.tsx` (handler + palette + props).
- Fixtures: regenerated `src/test/beatStyleFixtures.ts` (basslines changed every
  style's serialized grid + hit count); regenerated
  `styleProfiles.generated.ts` (unchanged — fidelity excludes pitched lanes).

## Tests

- `bassGuitarPitch.test.ts` — register (octave above 808), default detection,
  clamp, serialize/deserialize round-trip, non-empty synth PCM.
- `sequencerDomain.test.ts` — bassGuitar is a pitched binary-toggle lane;
  `updateSequencerBassGuitarStepPitch` clamps.
- Updated every lane-count / serialization / golden / scheduling / density test
  to the new 8-lane reality.

## Known minor gap (not blocking)

`summarizePatternChange`'s `instrumentSummaries` does not surface the bass-guitar
lane (it still lists the 7 original lanes), so the coach won't comment on
bass-guitar edits. Cosmetic; left for a follow-up.

## Gate

`npm run check` (hygiene + script typecheck + 440 tests) and `npx tsc --noEmit`
both green. No smplr dependency added.
