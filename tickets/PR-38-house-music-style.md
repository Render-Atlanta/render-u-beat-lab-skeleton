# PR-38 - House Music style

**Type:** Feature
**Depends on:** PR-02 (editable step sequencer), PR-27 (clap/808 lanes)
**Related:** PR-37 (New Orleans Bounce — shares the "add a style" scaffold)
**Source:** New genre request

## Context

Every shipped pocket is hip-hop/R&B adjacent; none teaches the four-on-the-floor
foundation of dance music. House — a steady kick on every beat, offbeat open
hats, and claps on 2 and 4 — is the clearest way to teach straight-time feel and
contrast it with the syncopated pockets. Adding it as a ninth preset broadens the
workshop beyond the current cluster.

## Scope

Add a new `BeatStyleId` (suggested id: `house`) end to end, mirroring the
scaffold in PR-37. TypeScript's exhaustive `Record<BeatStyleId, …>` maps will
flag every required entry:

- `src/lib/beatStyles.ts` — add the id to the `BeatStyleId` union and a
  `BEAT_STYLES.house` entry: name "House Music", a four-on-the-floor pattern
  (kick on all four beats, claps on 2 and 4, offbeat open hats; starting point
  ~124 BPM, swing 0), `musicalKey`, and a `lesson` string explaining straight
  time vs. the swung pockets.
- `src/lib/beatCoach.ts` — add a `STYLE_COACH_NOTES.house` entry
  (`concept` / `feelNote` / `tryThis`).
- `src/lib/styleReferences.ts` and `src/lib/openReferences.ts` /
  `src/lib/openReferencesData.ts` — add reference tracks (prefer open-licensed
  examples for the bundleable set).
- `src/lib/styleProfiles.generated.ts` — regenerate via
  `npm run generate:style-profiles`.
- `src/test/beatStyleFixtures.ts` + `src/lib/beatStyles.golden.test.ts` — add the
  golden density/pocket fixture.
- Confirm the style strip card renders the new pocket with no layout regressions.

## Acceptance criteria

- "House Music" appears as a ninth pocket and loads a four-on-the-floor pattern
  that plays on both audio engines.
- Beat Coach copy explains the straight-time feel; the fidelity meter scores
  against a real generated profile.
- `npm run check` passes, including the regenerated golden fixtures.

## Out of scope

House sub-genre presets (deep, tech, etc.) and dedicated house sample kits — this
ticket is one canonical four-on-the-floor preset.
