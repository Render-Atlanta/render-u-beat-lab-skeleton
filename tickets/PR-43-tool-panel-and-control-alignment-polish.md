# PR-43 - Tool panel and control alignment polish

**Type:** UI polish
**Depends on:** PR-32
**Wave:** 5 (Workshop readiness)
**Related:** PR-40 (mobile layout)
**Source:** Codex workshop audit, 2026-06-21

## Context

The redesigned desktop shell is visually strong, but several controls are
misaligned or clipped in the live branch:

- The 340px rail tool tab row overflows horizontally; after selecting Tag or
  Arrange, earlier/later tabs can be hidden.
- The Engine select is 84px wide and clips `Web Audio`.
- The fixed transport can cover lower content in tool panels, especially export
  actions in Arrange.
- Some control groups feel like wrapped desktop rows rather than intentional
  compact controls.

These are not build blockers, but they add friction during a live demo.

## Scope

- Replace the rail tool tab row with a layout that exposes all tools at 340px:
  two-row tabs, a segmented dropdown, or icon+label buttons with stable widths.
- Give the Engine control enough width for `Web Audio` and `Tone.js` in every
  supported layout.
- Reserve bottom space inside rail/focus/mobile panels so fixed transport does
  not obscure the last actions.
- Align sequencer control rows by grouping tempo, groove, history, drummer, and
  practice aids into stable responsive clusters.
- Add visible focus states for tab and transport controls if any are missing
  after the layout changes.

## Acceptance criteria

- All tool tabs are discoverable without horizontal tab-strip scrolling at the
  default desktop rail width.
- `Web Audio` is not clipped in the Engine select.
- Export buttons in Arrange can be reached and are not hidden behind transport.
- Control groups wrap predictably at desktop, tablet, and mobile widths.
- Browser screenshots at 1280px and 390px show no clipped labels in primary
  controls.

