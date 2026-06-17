# PR-01 - Scaffold playable shell

**Type:** Foundation  
**Depends on:** none

## Context

We need the fastest possible workshop prototype: a branded page that can play a
few beat styles before any microphone work begins.

## Scope

- Vite + React + TypeScript app.
- RenderATL-inspired design tokens and layout.
- Five genre starter patterns: Trap, Crunk, Drill, R&B, Pop.
- Native Web Audio synthesized kick/snare/hat/open-hat.
- Pattern helper tests.
- Render static site config.

## Acceptance criteria

- User can click `Run it` and hear a loop.
- User can switch styles while playback is running.
- App has no copyrighted audio assets.
- `npm test` covers pattern conversion and quantization helpers.
- `npm run build` creates a static `dist/`.
