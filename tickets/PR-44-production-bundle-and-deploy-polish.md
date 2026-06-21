# PR-44 - Production bundle and deploy polish

**Type:** Quality / Infrastructure
**Depends on:** PR-09, PR-32, PR-39
**Wave:** 5 (Workshop readiness)
**Related:** PR-41 (workshop happy path)
**Source:** Codex branch audit, 2026-06-21

## Context

The deployed branch is healthy: tests pass and `npm run build` completes. The
production build reports a chunk-size warning, with the main JavaScript bundle
around 573 kB minified / 169 kB gzip. That is acceptable for the current Vercel
deployment, but it is worth reducing before a room full of attendees loads the
app at once.

The current branch also adds `.vercel` to `.gitignore`, which is the right
deploy hygiene change.

## Scope

- Split dev/spike-only or infrequently used surfaces behind dynamic imports:
  song decomposition, reference analysis, Meyda-heavy analysis, or Tone sample
  paths where practical.
- Keep the default workshop path fast: style picker, sequencer, transport, coach,
  and producer tag should load without pulling unnecessary analysis code.
- Add a small build-size note to deployment docs so future agents know what size
  warning is expected versus actionable.
- Confirm Vercel build settings still match `npm run build` and static Vite
  output.

## Acceptance criteria

- `npm run build` passes.
- The default app chunk no longer triggers Vite's 500 kB warning, or the warning
  is intentionally documented with rationale.
- Lazy-loaded paths still work when opened, including `?songlab=1`.
- No change to Vercel auth/deploy behavior.

