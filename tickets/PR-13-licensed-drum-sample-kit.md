# PR-13 - Licensed drum sample kit

**Type:** Feature  
**Depends on:** PR-12

## Context

The biggest quality jump will come from using real drum one-shots instead of
synthetic clicks and noise. The workshop needs assets that are legal to ship,
small enough for a static deploy, and labeled clearly for learning.

## Scope

- Select or create a permissively licensed starter kit for kick, snare/clap,
  closed hat, open hat, and optional 808/sub hits.
- Store license notes and source attribution in the repo.
- Add a sample manifest that maps styles to kit pieces.
- Add loading states and fallback behavior if a sample fails to load.
- Keep initial assets small enough for fast Render static hosting.

## Acceptance criteria

- Every bundled sample has documented license/source information.
- The app can load the kit from a production build without console errors.
- Tests validate the sample manifest shape and required lane coverage.
- The default beat sounds noticeably fuller than the synthetic fallback.
