# PR-15 — Reference Profile Analyzer (Issue #21)

**Type:** Tooling
**Status:** Design approved 2026-06-17
**Depends on:** PR-03 (closed)

## Problem

Reference songs help non-producers understand why a style preset feels right or
wrong. The app already ships metadata-only references in `STYLE_REFERENCES`
(`src/lib/styleReferences.ts`), but those entries are written by hand. We want a
small **offline** tool that turns a developer's *own* audio file into a
reviewable draft profile (tempo, feel BPM, onset density, swing estimate, plain
notes) so a human can sanity-check the numbers and then hand-add a clean entry
to `STYLE_REFERENCES`.

Hard constraints:

- No copyrighted reference audio is ever committed to the repo.
- Generated profiles are educational metadata only, reviewed before use.
- Stays in the existing TypeScript/Node workshop toolchain — easy to inspect
  live, no Python/librosa env.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Runtime | Node / TypeScript | Lives in the existing toolchain; reuses `onsetDetection.ts`. librosa is only a conceptual reference in the issue, not a requirement. |
| Output shape | Superset draft | Mirrors `StyleReferenceTrack` fields for easy copy-in, plus a `measured` block of raw numbers for reviewer judgment. |
| Input format | WAV only | Pure-JS PCM decode, zero native deps, deterministic. Other formats: document `ffmpeg -i in.mp3 out.wav`. |
| Script runner | `tsx` devDependency | Standard, tiny, gives a clean `npm run analyze:reference`. |

## Architecture

Follows the repo convention of **pure domain functions + a thin I/O shell**
(same split as `onsetDetection.ts` / `captureAnalysis.ts`). The audio decode and
file I/O live in the script shell; all logic that has interesting behavior is a
pure, fixture-tested function.

| File | Responsibility | Tested |
| --- | --- | --- |
| `src/lib/wav.ts` | `decodeWav(buffer) → { samples: Float32Array, sampleRate, durationMs }`. Minimal PCM WAV parser (16/24/32-bit PCM + 32-bit float), mono-downmix. Throws clear errors on unsupported/non-WAV input. | ✅ synthetic buffer |
| `src/lib/referenceAnalysis.ts` | `analyzeWaveform(samples, sampleRate, options?) → MeasuredProfile`. Reuses `waveformToAmplitudeEnvelope` + `detectOnsets`, then estimates tempo from inter-onset intervals and computes onset density. | ✅ synthetic click-track |
| `src/lib/referenceProfile.ts` | Types + `buildReferenceProfile(measured, meta?) → StyleReferenceProfileDraft` and `validateReferenceProfile(draft) → ValidationResult`. Pure normalization: feel-BPM derivation, swing labeling, density description, plain-English note generation. | ✅ fixtures |
| `scripts/analyze-reference.ts` | I/O shell: parse argv (`<file.wav> [--out path]`), read file, `decodeWav` → `analyzeWaveform` → `buildReferenceProfile`, emit JSON to stdout or `--out`. | ❌ (I/O only) |

### Data flow

```
file.wav --(readFileSync)--> Buffer
  --> decodeWav() --> { samples, sampleRate, durationMs }
  --> analyzeWaveform() --> MeasuredProfile
  --> buildReferenceProfile(measured, metaFromFlags) --> StyleReferenceProfileDraft
  --> JSON.stringify --> stdout | --out file
```

## Types

```ts
// referenceAnalysis.ts
export interface MeasuredProfile {
  detectedBpm: number;        // dominant tempo from inter-onset intervals
  tempoConfidence: number;    // 0..1, share of intervals near the dominant tempo
  onsetCount: number;
  onsetDensityPerSec: number; // onsets / durationSec
  durationSec: number;
}

// referenceProfile.ts
export interface StyleReferenceProfileMeta {
  artist?: string;
  title?: string;
  sourceUrl?: string;
}

export interface StyleReferenceProfileDraft {
  metadata: { artist: string; title: string; sourceUrl: string }; // blank unless supplied
  bpm: number;                 // rounded detectedBpm
  feelBpm?: number;            // present when detectedBpm is high (half-time feel)
  swing: "straight" | "light" | "medium" | "heavy";
  profile: string;             // generated plain-English draft note
  measured: MeasuredProfile;   // raw numbers for reviewer judgment
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

`bpm` / `feelBpm` / `swing` / `profile` mirror `StyleReferenceTrack` so a reviewer
can copy the clean fields straight into `STYLE_REFERENCES`. `metadata` and
`measured` are draft-only scaffolding that do not exist on `StyleReferenceTrack`.

## Normalization rules (pure, in `buildReferenceProfile`)

- **bpm**: `Math.round(detectedBpm)`.
- **feelBpm**: set to `Math.round(detectedBpm / 2)` when `detectedBpm >= 140`
  (half-time feel); omitted otherwise. Matches how existing entries use
  `feelBpm`.
- **swing**: bucket a swing estimate (mean off-grid deviation of onsets vs. the
  detected 16th grid) into `straight | light | medium | heavy`. Exact thresholds
  fixed in implementation and covered by fixtures. Defaults to `straight` when
  there are too few onsets to judge.
- **profile**: template string combining tempo, feel, and a density descriptor
  (`sparse | moderate | busy`), e.g.
  `"Detected ~142 BPM (half-time feel ~71). Moderate onset density (4.2/s)."`
- **metadata**: defaults to empty strings; populated only from explicit CLI
  flags (`--artist`, `--title`, `--source`).

`validateReferenceProfile` rejects: missing/non-finite `bpm`, `bpm` outside a
sane 40–300 range, unknown `swing` label, empty `profile`, missing `measured`
fields, negative density/duration.

## Tempo estimation (in `analyzeWaveform`)

1. Build an amplitude envelope with `waveformToAmplitudeEnvelope(samples, durationMs)`.
2. `detectOnsets(envelope)` → onset times.
3. Compute inter-onset intervals; build a histogram of implied BPMs
   (`60000 / intervalMs`), folding by octave into a 60–200 BPM range.
4. `detectedBpm` = histogram peak; `tempoConfidence` = share of intervals within
   a tolerance band of that peak.
5. `onsetDensityPerSec = onsetCount / durationSec`.

This is intentionally rough — the output is a *draft for human review*, not an
authoritative transcription. The synthetic click-track tests assert it lands on
the right BPM for clean inputs.

## No-audio-in-repo guarantee

- `.gitignore`: add `reference-audio/` and `*.wav` (workshop scratch inputs).
- `scripts/analyze-reference.ts` reads from any path the dev passes; the repo
  ships no audio.
- Doc note (in `docs/TONE_MEYDA_SPIKES.md` sibling or a short `scripts/README.md`)
  stating audio files are never committed and generated profiles are educational
  metadata only.

## Run UX

```
npm run analyze:reference -- path/to/loop.wav
npm run analyze:reference -- path/to/loop.wav --out profile.json --artist "X" --title "Y" --source "https://..."
```

Default: pretty-printed JSON to stdout. `--out` writes to a file. Non-WAV or
unreadable input exits non-zero with a clear message.

`package.json`:
```jsonc
"scripts": { "analyze:reference": "tsx scripts/analyze-reference.ts" }
// devDependencies: + tsx
```

## Tests (no real songs)

- `wav.test.ts`: hand-built WAV byte buffers (16-bit PCM, float32, stereo
  downmix, bad header) → asserts decoded samples/sampleRate/duration and error
  cases.
- `referenceAnalysis.test.ts`: synthetic deterministic click-tracks at known BPM
  (e.g. impulses every 500 ms → 120 BPM) → asserts `detectedBpm`, density,
  duration within tolerance.
- `referenceProfile.test.ts`: fixture `MeasuredProfile` objects → asserts
  feel-BPM derivation, swing bucketing, density descriptor, note text, and that
  `validateReferenceProfile` accepts good drafts and rejects each malformed case.

## Acceptance criteria mapping

| Issue criterion | Covered by |
| --- | --- |
| Developer can run analyzer locally against own audio | `npm run analyze:reference` + `decodeWav` |
| Repo includes no copyrighted reference audio | `.gitignore` + doc note; no audio committed |
| Profile JSON includes BPM, feel BPM when relevant, density, plain notes | `StyleReferenceProfileDraft` via `buildReferenceProfile` |
| Tests cover profile validation without real songs | `referenceProfile.test.ts` + synthetic fixtures |

## Out of scope (YAGNI)

- MP3/FLAC decoding (document ffmpeg conversion instead).
- Auto-writing into `STYLE_REFERENCES` (human review is the point).
- Key/melody/genre detection.
- A UI — this is an offline dev tool only.
