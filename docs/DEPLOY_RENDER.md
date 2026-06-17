# Render Deploy Runbook

## Service shape

`render.yaml` defines one static site:

```yaml
services:
  - type: web
    name: render-u-beat-lab
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
```

Render's Blueprint spec uses `type: web` plus `runtime: static` for static
sites, and `staticPublishPath` is required for the directory containing the
built static files.

## Why Render works for this workshop

- The app is a static browser app after `npm run build`.
- Future microphone capture needs a secure context.
- Render provides HTTPS on the generated `onrender.com` URL.
- Render automatically redirects HTTP traffic to HTTPS.

## First deploy

1. Open the Render Dashboard.
2. Create a new Blueprint.
3. Connect `William-Hill/render-u-beat-lab`.
4. Select the `main` branch.
5. Review the generated static service named `render-u-beat-lab`.
6. Deploy.

## Pre-deploy smoke check

Run locally before pushing a deployment candidate:

```bash
npm ci
npm test
npm run build
npm run preview
```

Open the preview URL and confirm:

- The page title is `Render U Beat Lab`.
- The hero says `Turn table taps into a beat`.
- The style list includes Trap, Crunk, Drill, R&B, and Pop.
- The grid renders 64 step cells.
- Pressing `Run it` starts audio after a user gesture.
- No browser console errors appear on first load.

## Microphone readiness check

When issue #4 lands, verify the deployed site over HTTPS:

- Microphone permission prompt appears only after clicking the capture control.
- Denying permission keeps manual beat-making available.
- No captured audio is uploaded.
- The app explains unsupported browser states in plain language.

## Rollback

If a deploy breaks the workshop path, use Render's rollback action to return to
the last known-good deploy. The safest fallback demo is still the manual
sequencer: genre presets, grid edits, and producer tag do not depend on a
microphone.
