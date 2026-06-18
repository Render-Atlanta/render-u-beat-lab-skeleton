# Style Fidelity Score

## What the score means

The style fidelity score (0–100 %) measures how similar a user's edited beat
pattern is to the **canonical genre signature** — the rhythm skeleton that
defines a given style.

**Honest framing:** the score captures rhythm density, tempo alignment, and
spectral balance (kick/snare/hat weight distribution) relative to the genre
archetype. It does **not** measure whether the pattern sounds like a specific
commercial record. Timbre is genre-neutral because all patterns share the same
decoded kit; two patterns that differ only by instrument selection will score
identically. A high score means the rhythmic structure closely follows the
genre template, not that it sounds "professional" or "authentic" in a
subjective sense.

## How scoring works

1. **Golden snapshot** — `scripts/generate-style-profiles.ts` reads every
   genre's canonical `pattern` from `src/lib/beatStyles.ts`, runs
   `scoreStyleFidelity`, and writes the resulting feature vectors to
   `src/lib/styleProfiles.generated.ts`. These snapshots are the ground truth.

2. **Nearest-neighbor oracle** — at runtime, `scoreStyleFidelity` computes a
   feature vector for the current pattern and finds the closest golden snapshot
   via cosine similarity. The closest match becomes `nearestGenre`. If
   `nearestGenre !== styleId`, the meter shows a hint ("closer to …").

3. **Score** — the raw cosine similarity between the current pattern's feature
   vector and the target genre's golden snapshot, clamped to [0, 1].

## Regenerating style profiles

Run when you change a genre's canonical pattern in `src/lib/beatStyles.ts` or
alter the feature-extraction logic in `src/lib/styleFidelity.ts`:

```bash
npm run generate:style-profiles
```

This overwrites `src/lib/styleProfiles.generated.ts`. Commit the updated file so the
new snapshots become the test oracle. The existing golden-snapshot tests in
`src/lib/styleFidelity.test.ts` will fail if you forget to regenerate.

## UI meter

`src/components/StyleFidelityMeter.tsx` renders the score for the **user's
currently edited pattern** against the **selected genre**. The bar fill width
reflects the score percentage in real time as the user toggles steps. The
`nearestGenre` hint appears only when the pattern drifts closer to a different
genre.
