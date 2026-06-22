# Drum sample kit — license & attribution

All samples in this directory are **original works** synthesized by
[`scripts/generate-kit.ts`](../../scripts/generate-kit.ts) and dedicated to the
public domain under [Creative Commons Zero (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).

You may use, modify, and redistribute them for any purpose without attribution.

## Format

- 16-bit PCM, mono, 22.05 kHz WAV
- Short one-shots (~60–450 ms) sized for fast static hosting

## Samples

| File pattern | Lane | Source | License |
| ------------ | ---- | ------ | ------- |
| `kick.wav`, `punchy/kick.wav`, `airy/kick.wav` | kick | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `snare.wav`, `punchy/snare.wav`, `airy/snare.wav` | snare | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `hat.wav`, `punchy/hat.wav`, `airy/hat.wav` | hat | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `openHat.wav`, `punchy/openHat.wav`, `airy/openHat.wav` | openHat | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `clap.wav`, `punchy/clap.wav`, `airy/clap.wav` | clap | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |
| `808.wav`, `punchy/808.wav`, `airy/808.wav` | 808 | Original — synthesized by `scripts/generate-kit.ts` | CC0 1.0 |

The app exposes three generated kit flavors:

- `classic` — balanced workshop kit at the root of `public/kit`.
- `punchy` — shorter, more front-loaded hits in `public/kit/punchy`.
- `airy` — brighter hits with a small room tail in `public/kit/airy`.

`kick`, `snare`, `hat`, `openHat`, `clap`, and `808` are the required lanes the
Tone.js sample engine resolves from the selected kit (see `src/audio/sampleKit.ts`).

## Regenerating

The generator is deterministic (seeded PRNG, no `Math.random`/`Date.now`), so
re-running produces byte-identical files:

```sh
npm run generate:kit
```
