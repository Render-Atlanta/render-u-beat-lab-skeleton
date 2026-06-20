# PR-37 - New Orleans Bounce style

**Type:** Feature
**Depends on:** PR-02 (editable step sequencer), PR-27 (clap/808 lanes)
**Related:** PR-38 (House style — shares the "add a style" scaffold)
**Source:** New genre request

## Context

The style strip ships seven "starting pockets" (Atlanta Trap, Crunk Chant,
Drill Slide, R&B Pocket, Pop Bounce, Afrobeats, Amapiano). New Orleans Bounce —
the up-tempo, call-and-response sound built on the syncopated "Triggerman"
groove — is a culturally important pocket that beginners recognize instantly and
that teaches a very different feel from trap. Adding it as an eighth preset gives
the workshop another authentic starting point.

## Scope

Add a new `BeatStyleId` (suggested id: `bounce`) end to end. Because several
`Record<BeatStyleId, …>` maps are exhaustive, TypeScript will list every place
that needs an entry:

- `src/lib/beatStyles.ts` — add the id to the `BeatStyleId` union and a
  `BEAT_STYLES.bounce` entry: name "New Orleans Bounce", an authentic Triggerman-
  style pattern (busy syncopated snare/hat with call-and-response space; starting
  point ~98 BPM, light swing, kick + 808 driving the bounce), `musicalKey`, and a
  `lesson` string.
- `src/lib/beatCoach.ts` — add a `STYLE_COACH_NOTES.bounce` entry
  (`concept` / `feelNote` / `tryThis`).
- `src/lib/styleReferences.ts` and `src/lib/openReferences.ts` /
  `src/lib/openReferencesData.ts` — add reference tracks (prefer open-licensed
  examples for the bundleable set).
- `src/lib/styleProfiles.generated.ts` — regenerate via
  `npm run generate:style-profiles` so the fidelity meter has a profile.
- `src/test/beatStyleFixtures.ts` + `src/lib/beatStyles.golden.test.ts` — add the
  golden density/pocket fixture for the new pattern.
- Confirm the style strip card (name / BPM·swing meta / concept note) renders the
  new pocket with no layout regressions.

## Acceptance criteria

- "New Orleans Bounce" appears as an eighth pocket in the style strip and loads a
  recognizable bounce pattern that plays on both audio engines.
- Beat Coach shows concept / feel / try-this copy for the style; the fidelity
  meter scores against a real generated profile.
- `npm run check` passes, including the regenerated golden fixtures.

## Out of scope

Per-style sample kits or vocal-chant samples (the Triggerman "Drag Rap" hook is
not bundled). This ticket is the pattern preset only.
