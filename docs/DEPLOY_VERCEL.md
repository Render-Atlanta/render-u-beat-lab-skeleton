# Vercel Deploy Runbook

## Service shape

The app is a static Vite + React build. `vercel.json` pins the framework and
output so the project detects identically on CI and the dashboard:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

`npm run build` runs the module-hygiene check, `tsc --noEmit`, and `vite build`,
emitting the static site to `dist/` (including the bundled CC0 drum kit under
`dist/kit/`).

The Vite config intentionally splits heavier optional paths into named chunks:

- `audio-tone` for the Tone.js sample engine.
- `analysis-meyda` for Meyda feature extraction.
- `songlab` for the `?songlab=1` upload/decomposition spike.

The default workshop path should stay in the main app chunk; optional analysis
and alternate audio runtimes should not be added back to it accidentally.

## Why Vercel works for this workshop

- The app is a fully static browser app after `npm run build`.
- Microphone capture needs a secure context — Vercel serves every deployment
  over HTTPS automatically (preview and production).
- Each push gets an immutable preview URL; `main` is promoted to production.

## First deploy

Using the Vercel CLI from the repo root:

```bash
npm i -g vercel        # if not already installed
vercel login           # one-time auth
vercel link            # connect this repo to a Vercel project
vercel                 # deploy a preview
vercel --prod          # promote to production
```

Or connect the GitHub repo in the Vercel dashboard (New Project → import
`William-Hill/render-u-beat-lab`); Vercel auto-detects the Vite preset and
deploys `main` to production on every push.

## Pre-deploy smoke check

Run locally before promoting a deployment candidate:

```bash
npm ci
npm test
npm run build
npm run preview
```

Open the preview URL and confirm:

- The page title is `Render U Beat Lab`.
- The hero says `Tap out a beat`.
- The style list includes Atlanta Trap, Crunk Chant, Drill Slide, R&B Pocket,
  and Pop Bounce.
- The grid renders 16 visible step cells per revealed lane.
- Pressing Play starts audio after a user gesture.
- `?workshop=1` shows the workshop checklist and keeps guided mode off.
- `?songlab=1` lazy-loads the song decomposition spike panel.
- `/kit/kick.wav` serves as `audio/wav` (the drum kit loads).
- No browser console errors appear on first load.

## Microphone readiness check

Verify the deployed site over HTTPS:

- Microphone permission prompt appears only after clicking the capture control.
- Denying permission keeps manual beat-making available.
- No captured audio is uploaded.
- The app explains unsupported browser states in plain language.

## Rollback

Use the Vercel dashboard (or `vercel rollback`) to instantly promote the last
known-good deployment. The safest fallback demo is still the manual sequencer:
genre presets, grid edits, and producer tag do not depend on a microphone.
