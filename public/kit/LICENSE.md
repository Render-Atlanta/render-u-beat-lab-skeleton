# Drum sample kit — license & attribution

All samples in this directory are **original works** synthesized by
[`scripts/generate-kit.ts`](../../scripts/generate-kit.ts) and dedicated to the
public domain under [Creative Commons Zero (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).

You may use, modify, and redistribute them for any purpose without attribution.

## Format

- 16-bit PCM, mono, 22.05 kHz WAV
- Short one-shots (~60–400 ms) sized for fast static hosting

## Samples

| File          | Lane      | Source                                         | License |
| ------------- | --------- | ---------------------------------------------- | ------- |
| `kick.wav`    | kick      | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `snare.wav`   | snare     | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `hat.wav`     | hat       | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `openHat.wav` | openHat   | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `clap.wav`    | (extra)   | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `808.wav`     | (extra)   | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |

`kick`, `snare`, `hat`, and `openHat` are the required lanes the Tone.js sample
engine loads (see `src/audio/sampleKit.ts`). `clap` and `808` are bundled extras
for future use and are not yet wired to a lane.

## Regenerating

The generator is deterministic (seeded PRNG, no `Math.random`/`Date.now`), so
re-running produces byte-identical files:

```sh
npm run generate:kit
```
