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

## Design system notes

This skeleton borrows the RenderATL demo design language:

- cream background, ink text, signature pink accent
- uppercase display type and eyebrow labels
- sharp 6px corners, visible borders, minimal shadows
- `★` as the brand motif

The production version should either vendor a small local subset of the
RenderATL tokens or publish/import the shared `@renderatl/ui` package.
