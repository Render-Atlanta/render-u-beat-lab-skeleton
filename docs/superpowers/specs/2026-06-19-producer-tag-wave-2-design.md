# Producer Tag — Wave 2 Design (set / record / in-beat / export)

**Date:** 2026-06-19
**Tickets:** PR-25 (set + record voice), PR-26 (in-beat + export)
**Audience:** RenderATL workshop attendees — software builders, not musicians.
**Builds on:** Wave 1 (merged, PR #38). Pull-based engine seam is the precedent.

## Goal

Make the producer tag real: let a beginner **set** a tag, **record their own
voice** as the tag, **drop it into the beat** (manual / intro / every loop), and
**export the finished beat as a downloadable WAV** with the tag mixed in.

Today the tag is text-to-speech only, played via `speechSynthesis` *outside* the
audio graph (so it can't be mixed or exported), the text input is buried in the
coach panel, and WAV export is a deliberate "unsupported" stub
(`createUnsupportedWavExportResult`). Wave 2 closes all four gaps.

## Decisions (resolved with the user)

- **Export scope:** build a **real WAV exporter** — offline-render the drums,
  mix the recorded tag at its placement offsets, encode to WAV, download.
- **Placement model:** three triggers — **manual**, **intro** (once at start),
  **every-loop**. No per-step pinning this wave.
- **Recorded audio is session-scoped:** the project-JSON export records tag
  *placement + source* (`text` | `recorded`), not the audio bytes. A shared JSON
  carries the tag's settings, not the recording. (Embedding base64 audio is a
  future wave.) The WAV download is where the recorded audio actually ships.

## The one hard boundary

A recorded tag arrives from `captureMicrophoneSample` as a compressed `Blob`
(WebM/Opus). Turning it into PCM requires `AudioContext.decodeAudioData` — a
**browser-only** step. Everything downstream of decode operates on a plain
`Float32Array` + sample rate, so it is pure and node-testable. The design keeps
decode as a thin glue layer at the React edge; all mixing, rendering, encoding,
and scheduling logic takes already-decoded PCM.

```
record (mic Blob) ──decodeAudioData──▶ tag PCM {samples, sampleRate}
   browser-only glue                        │
                                            ├─▶ engine.setProducerTagSample(pcm)  ──▶ live playback
                                            │       (web-audio AudioBuffer on master;            (manual / intro /
                                            │        tone buffer; fake records)                   every-loop)
                                            │
                                            └─▶ WAV export (pure):
                                                  renderPatternToPcm(drums)        [exists]
                                                  + mixSampleIntoPcm(tag @offsets)  [new, pure]
                                                  + encodeWav(samples, rate)        [new, pure]
                                                  ──▶ Blob download (browser glue)
```

## Architecture / units

### Pure (node-tested)
- **`producerTag.ts` (extend):** add `source: "text" | "recorded"` to the
  config and add `"loop"` to `ProducerTagTrigger` (now `manual | intro | loop`).
  Normalizers + validators updated. The config stays serializable — it never
  holds audio.
- **`wav.ts` (extend):** add `encodeWav(samples: Float32Array, sampleRate:
  number): Uint8Array` — 16-bit PCM RIFF/WAVE. Round-trips with the existing
  `decodeWav`.
- **`tagMix.ts` (new):** `mixSampleIntoPcm(dest: Float32Array, sample:
  Float32Array, offsetSamples: number): void` — add a sample into a buffer at an
  offset, clamping to bounds. And `tagOffsetsForTrigger(trigger, loopCount,
  loopSamples): number[]` — where the tag lands given the placement model.
- **`exportBeat.ts` (new) or extend `styleRender.ts`:** `renderBeatWav({pattern,
  style, kit, tag?, loops}): Uint8Array` — compose drums render + tag mix +
  encode into the final WAV bytes. Pure given decoded inputs.

### Engine seam (all three engines + shared contract)
- **`setProducerTagSample(pcm: { samples: Float32Array; sampleRate: number } |
  null): void`** — hand the engine the decoded tag; web-audio builds an
  `AudioBuffer` in its own context, tone builds its buffer, fake records it.
- **`playProducerTag`** — plays the recorded buffer through `master` when a
  sample is set and `source === "recorded"`; otherwise the existing TTS/fallback
  path. (Recorded path is mixable and matches the export.)
- **Every-loop trigger:** the web-audio scheduler already tracks loop boundaries
  (step 0); fire the tag buffer at each loop start when `trigger === "loop"`.
  Tone mirrors via its transport. Fake records trigger calls.

### Browser glue (thin, not unit-tested)
- Decode mic `Blob → {samples, sampleRate}` via `decodeAudioData`.
- WAV `Uint8Array → Blob → object URL → <a download>` click.
- `captureMicrophoneSample({ durationMs })` for the short tag recording.

### UI
- **`ProducerTagControls.tsx` (rework):** add Record / Re-record / Clear, a
  source toggle (Type ↔ Record), a play-preview, and the existing rate/pitch for
  the TTS path; add the "loop" option to the trigger select. Make the control
  read as one coherent unit with the hero "Producer tag" button.
- **`ArrangementPanel.tsx`:** add a **Download WAV** action that runs the export
  pipeline and downloads; replace the "unsupported" messaging.
- **`App.tsx`:** hold tag source + decoded PCM in state; on record →
  decode → `engine.setProducerTagSample`; thread placement + source into the
  project JSON and the WAV export.

## Testing strategy

- Node env, `renderToStaticMarkup` for components — unchanged from Wave 1.
- Pure helpers carry the logic and the coverage: `encodeWav` round-trips through
  `decodeWav`; `mixSampleIntoPcm` (offset, clamp, additive); `tagOffsetsForTrigger`
  (manual→[], intro→[0], loop→[0, loopSamples, 2·loopSamples…]); `renderBeatWav`
  produces a valid WAV whose decoded length matches `loops`.
- Engine contract: `setProducerTagSample` accepted by all three; recorded-tag
  playback counted by the probe; `null` clears; loop-trigger fires per loop.
- `producerTag.ts`: source + `loop` trigger normalize/validate; JSON round-trips
  the new fields.
- Decode + download glue is browser-only and explicitly not unit-tested.

## Sequencing (plan tasks)

1. `producerTag` domain: `source` + `loop` trigger (pure).
2. `encodeWav` (pure).
3. `tagMix` helpers — `mixSampleIntoPcm` + `tagOffsetsForTrigger` (pure).
4. `renderBeatWav` export composition (pure).
5. Engine `setProducerTagSample` + recorded-tag playback (3 engines + contract).
6. Engine every-loop trigger scheduling (3 engines + contract).
7. UI + wiring: record/source/clear in ProducerTagControls; decode glue; Download
   WAV in ArrangementPanel; App state + JSON/export threading.

Tasks 1–4 are independent pure units (parallel-safe in principle, executed
serially). 5–6 extend the engine seam. 7 integrates and is the only browser-glue
task. Each ends green under `npm run check`.
