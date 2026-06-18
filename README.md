# Render U Beat Lab

A RenderATL University workshop project for building a browser beat machine that
can grow from manual patterns into beatbox/table-tap capture.

The public app name can still change. The repo name is intentionally plain:
`render-u-beat-lab`.

## Why this project

This is a hook for **From Vibe Coding to AI Engineering, Part 2: Building Your
Own AI Workflows**. The app is fun, but the point is the workflow:

1. Capture product intent in a spec.
2. Slice it into small, testable tickets.
3. Teach the agent repo standards once.
4. Iterate from a playable prototype to smarter behavior.
5. Deploy the result as a static JavaScript app.

## Prototype ladder

| Prototype | Goal | Demo moment |
| --- | --- | --- |
| P0 | Playable genre templates | Pick Trap/Crunk/Drill/R&B/Pop and hear a loop |
| P1 | Editable sequencer | Toggle grid cells and learn what each instrument does |
| P2 | Tap capture | Tap table, detect onsets, quantize to a 16-step grid |
| P3 | Beatbox capture | Classify low/mid/high sounds into kick/snare/hat |
| P4 | Producer mode | Add tag, swing, arrangement, and export/share |

## Tech stack

- Vite + React + TypeScript
- Native Web Audio API for the first playable prototype
- Vitest for deterministic pattern/quantization tests
- Render Static Site deployment via `render.yaml`

Tone.js and Meyda are intentionally deferred until the capture prototype needs
them. The first version should teach rhythm and ship quickly without heavy
audio dependencies.

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Code quality

Run the full quality pass (module-size check, script typecheck, and tests):

```bash
npm run check
```

`npm run hygiene` runs the module-size check on its own, and `npm run build`
runs it automatically. See [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) for the
file-size target, the exceptions policy, and module/test guidance.

## Deploy to Render

This repo is configured as a Render Static Site through [`render.yaml`](render.yaml):

- build command: `npm ci && npm run build`
- publish directory: `./dist`

Before deploy, run:

```bash
npm test
npm run build
```

Then create the service from the Render Dashboard:

1. New > Blueprint.
2. Connect `William-Hill/render-u-beat-lab`.
3. Confirm the `render-u-beat-lab` static service from `render.yaml`.
4. Deploy from `main`.

The hosted app must run on HTTPS for future microphone capture work. Render
provides HTTPS on the `onrender.com` URL and managed TLS for custom domains.

See [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) for the workshop runbook.

## Design system notes

This skeleton borrows the RenderATL demo design language:

- cream background, ink text, signature pink accent
- uppercase display type and eyebrow labels
- sharp 6px corners, visible borders, minimal shadows
- `★` as the brand motif

The production version should either vendor a small local subset of the
RenderATL tokens or publish/import the shared `@renderatl/ui` package.
