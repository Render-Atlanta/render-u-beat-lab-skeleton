# Per-genre melody toplines for generated game tracks

**Issue:** [#133 — Add per-genre melody toplines to generated game tracks (follow-up to #126)](https://github.com/render-u-beat-lab/issues/133)

**Status:** Design — awaiting approval

## Problem
#126 shipped per-stage soundtracks as **drum + 808 + bass beat beds**. The built-in
`BEAT_STYLES` presets have empty `melody` lanes and `buildGameTrackSequencer`
overrides only `bpm`, so **no melody topline plays** in any of the six committed
`game-tracks/*.beatlab.json` (verified: 0 active `melody` steps across all six).
The tracks read as beats, not songs.

## Goal
Give each stage a distinct, genre-appropriate topline so the tracks read as songs.
Most impactful for the melodic genres (afrobeats / rnb / amapiano); the beat-forward
genres (trap / crunk) stay sparse. Every track remains an editable `.beatlab.json`
so lines can be auditioned and refined in the Beat Lab editor.

## Source of truth
The generate flow is **spec → JSON/WAV**: `scripts/render-game-tracks.ts` builds each
project purely from `GAME_TRACK_SPECS`, so the **spec table is the source of truth**
for melody, exactly as it already is for `styleId` / `bpm` / `bars`. The Beat Lab
editor is where lines are *auditioned and discovered* (open the `.beatlab.json`, craft,
hear the line, and read off the degrees), then the resulting arrays are transcribed into
the spec. This matches the issue's explicit "Approach" and keeps regeneration
deterministic (re-running the script never silently drops a hand-edited melody).

## Data model
Extend `GameTrackSpec` (`src/lib/gameTracks.ts`) with two optional fields:

```ts
export interface GameTrackSpec {
  slug: string;
  styleId: BeatStyleId;
  bpm: number;
  bars: number;
  /** Optional topline overlay. Length 16; `true` = the step sounds. Absent → no melody. */
  melody?: boolean[];
  /** Optional per-step scale degree (0–6) in the style's `musicalKey`. Length 16. */
  melodyStepPitches?: number[];
}
```

Both are optional so a spec with no topline (or a future new stage) stays byte-identical
to today's beat-bed behavior. `melody` gates which steps sound; `melodyStepPitches`
supplies the pitch per step (defaulting to root/degree 0 where omitted, via the existing
`normalizeMelodyStepPitches`).

## Overlay in `buildGameTrackSequencer`
```ts
export function buildGameTrackSequencer(spec: GameTrackSpec): SequencerState {
  const base = createDefaultSequencerState(spec.styleId);
  const sequencer: SequencerState = { ...base, bpm: spec.bpm };
  if (spec.melody) {
    // Fresh pattern object — never mutate the shared preset's melody array.
    sequencer.pattern = { ...base.pattern, melody: [...spec.melody] };
  }
  if (spec.melodyStepPitches) {
    sequencer.melodyStepPitches = [...spec.melodyStepPitches];
  }
  return sequencer;
}
```

Rendering is unchanged: melody plays at `MELODY_REGISTER_OFFSET` (48) via
`getMelodyPitchForStep` / `synthesizeMelodyNotePcm` (triangle synth) in the offline WAV
path, so no renderer changes are needed. Voice/timbre stays the synth default for
deterministic offline renders (sampled instrument voices are a separate concern, #130/#131).

## Starter toplines
One-bar (16-step) lines, looped across bars, in each style's existing `musicalKey`.
Degrees: 0=root, 1=2, 2=b3, 3=4, 4=5, 5=b6, 6=b7 (all minor keys here). These are
**starters authored by music theory** — in-key and rhythmically genre-appropriate — to
be auditioned and refined in the editor.

| Stage | Style / Key | Feel | Active steps (1-idx) | Degrees (at those steps) |
|---|---|---|---|---|
| airport | afrobeats / G min | bright lilt | 1,3,6,7,9,11,14 | 0,2,4,3,4,6,0 |
| badge | rnb / D min | soulful | 1,4,7,9,12,15 | 4,2,0,6,4,2 |
| afterparty | amapiano / F min | rolling | 1,4,6,9,12,14 | 0,2,4,6,4,2 |
| vendor | bounce / C min | chant | 1,3,5,7,9,11,13,15 | 0,0,2,2,4,4,2,0 |
| connector | trap / A min | sparse stab | 1,8,11 | 0,6,4 |
| mainStage | crunk / E min | hard stab | 1,7,9,15 | 0,0,4,4 |

`melodyStepPitches` is a full length-16 array; degrees on inactive steps are `0` (root)
and simply don't sound.

## Regeneration & docs
1. `npm run generate:game-tracks` rewrites the six `game-tracks/*.beatlab.json`
   (Beat Lab) and, when the Rush checkout is present, the six `*.wav` (Rush).
2. Update the #126 design doc's "Track content caveat" section
   (`docs/superpowers/specs/2026-07-01-per-level-soundtracks-design.md`) to state that
   toplines now ship, removing the "no melody topline plays" caveat.

## Testing (acceptance)
Extend `src/lib/gameTracks.test.ts`:
- Every spec now has a `melody` with ≥1 active step and a length-16 `melodyStepPitches`.
- The melodic stages (airport, badge, afterparty, vendor) carry non-default
  (`!melodyStepPitchesAreDefault`) pitches.
- `buildGameTrackSequencer` overlays the spec melody onto the sequencer (active-step
  count matches the spec) and does **not** mutate the shared `BEAT_STYLES` preset
  (building two sequencers leaves the preset's `melody` untouched).
- Existing round-trip (`exportProjectJson`/`importProjectJson`) and bar-count tests
  still pass.

## Non-goals
- No changes to the renderer, audio contract, or the Rush side (it just loads the new WAVs).
- No sampled/instrument melody voices in the offline render (synth topline only; #130/#131).
- No new stages or genre remapping.
