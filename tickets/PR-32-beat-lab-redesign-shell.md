# PR-32 - Beat Lab visual redesign shell

**Type:** Feature
**Depends on:** PR-29, PR-30, PR-31
**Wave:** 4 (Beat Lab redesign)
**Related:** PR-33 (velocity cells live in this grid), PR-34/35/36 (transport controls)
**Source:** `claude.ai/design` project "Drum app redesign cleanup" — `Beat Lab.dc.html`

## Context

The current app stacks every panel in one tall column (style selector → guided
banner → sequencer → fidelity meter → EQ → a single `aside` holding coach, tag,
arrange, and capture). The imported design re-shells the same seven lanes / seven
styles into a focused studio layout: a sticky nav, a compact hero, a horizontal
"pocket" style strip, a two-column work area with a **tabbed** tool panel, a
**fixed transport bar**, and a mobile tab bar.

This ticket is the **visual + structural shell only**. It re-skins and re-wires
existing behavior; it adds no new audio/data capability. The net-new behaviors it
makes room for ship in PR-33…PR-36.

## Scope

- **Theme tokens** in `styles.css`: cream/ink/pink palette, `Archivo Black` +
  `Instrument Sans` + `JetBrains Mono` (preconnect + `@font-face`/`<link>`),
  dotted-grid page background, focus-visible rings. Keep tokens as CSS variables
  so later waves and existing components inherit them.
- **Sticky nav**: brand lockup, a **layout switcher** (Rail / Focus / Pro), and a
  guided-mode toggle.
- **Compact hero** + **horizontal style strip**: re-skin `StyleSelector` into
  scroll-snap pocket cards (name / BPM·swing meta / concept note).
- **Two-column work area**: sequencer on the left; a **tabbed tool panel**
  (Coach / Tag / Arrange / Capture) on the right, replacing the stacked `aside`.
  Tabs swap which existing panel renders. No panel logic changes.
- **Sequencer re-skin**: header (style name + hit count), control row (BPM, swing,
  engine, clear, reset — plus disabled-looking placeholders for tap/undo/redo/
  count-in/metronome that the later waves wire up), and the step grid with lane
  chips (tap chip → role explainer), per-lane volume fader + reset, and 16 cells.
- **Fixed transport bar**: play/stop, metronome dot, 16 beat-dots driven by
  `activeStep`, the EQ visualizer, and Tools + Tag buttons. Reuses
  `EqVisualizer`.
- **Layout modes**: Rail (sticky sidebar), Focus (tool panel as a bottom sheet),
  Pro (wider padding, docked transport). Pure presentational state in `App`.
- **Mobile tab bar** (≤760px): Make / Coach / Tag / Arrange / Capture, swapping
  the single visible view; transport stays fixed above it.
- Keep all existing wiring intact: playback, BPM/swing, engine switch, lane
  volume, 808/melody pitch, guided mode, coach, capture, arrangement/song-mode,
  WAV/JSON export, URL share.

## Acceptance criteria

- The app renders the new nav / hero / style strip / two-column work area /
  transport / mobile bar and matches the design's visual language (palette,
  fonts, grid).
- Layout switcher toggles Rail / Focus / Pro; Focus shows the tool panel as a
  bottom sheet; the choice is presentational only.
- Tool tabs switch between Coach / Tag / Arrange / Capture; each existing panel
  still works (no regressions in playback, mixing, pitch, guided, capture,
  export, share).
- Transport bar plays/stops, beat-dots track the playhead, and the EQ animates
  during playback.
- Below 760px the mobile tab bar drives the visible view; the layout is usable on
  a phone-width viewport.
- `npm run check` passes; existing component tests are updated for new
  markup/labels (no behavior tests deleted).

## Out of scope (later waves)

Per-step velocity/accent + drag-to-paint (PR-33), undo/redo + autosave + compact
`?beat=` links (PR-34), count-in + metronome audio (PR-35), tap tempo (PR-36).
This PR may render those controls in a visibly inert state so the layout is final.
