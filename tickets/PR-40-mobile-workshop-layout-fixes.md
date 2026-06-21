# PR-40 - Mobile workshop layout fixes

**Type:** UI polish
**Depends on:** PR-32
**Wave:** 5 (Workshop readiness)
**Related:** PR-29 (guided mode), PR-32 (redesign shell)
**Source:** Codex workshop audit, 2026-06-21

## Context

The app passes tests and production build, but the live mobile layout is not
workshop-ready. At a 390px viewport, the document expands to about 674px wide.
The guided banner, sequencer panel, control rows, and step grid retain desktop
widths, which creates horizontal page scrolling and makes the viewport appear
split/sideways.

This matters for the next RenderATL University workshop because attendees should
be able to follow the happy path on a phone or narrow laptop pane without
debugging layout first.

## Scope

- Remove page-level horizontal overflow at phone widths. The document width must
  stay within the viewport; only the 16-step grid may scroll horizontally.
- Rework mobile `.work-area`, `.work-main`, `.guided-banner`, `.grid-panel`, and
  `.sequencer-controls` sizing so panels use `width: 100%`, `max-width: 100%`,
  and `min-width: 0` where needed.
- Make guided mode action buttons wrap into usable rows on mobile. No action
  should be clipped offscreen.
- Keep the step grid horizontally scrollable inside its own container, with the
  beat ruler and lane cells aligned while scrolling.
- Make the mobile tab bar fit seven items without overflow, clipping, or
  unreadable labels.

## Acceptance criteria

- At 390px wide, `document.documentElement.scrollWidth <= window.innerWidth`.
- The guided banner, sequencer controls, transport, and mobile tabs are fully
  visible without horizontal page scroll.
- The 16-step grid can still scroll horizontally inside `.step-grid`.
- Desktop rail, focus, and pro layouts are unchanged except for shared bug fixes.
- `npm test` and `npm run build` pass.

