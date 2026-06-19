# PR-34 - Undo / redo, autosave & compact share links

**Type:** Feature
**Depends on:** PR-32, PR-33
**Wave:** 4 (Beat Lab redesign)
**Related:** PR-02 (current URL-param share), PR-33 (velocity is part of a snapshot)
**Source:** `Beat Lab.dc.html` — `snapHist` / `pushHist` / `undo` / `redo`,
`serializeBeat`, `readLocal`, `readShareParam`, `shareBeat`

## Context

A learner experimenting with a beat needs a safety net (undo) and a way to keep
work between sessions (autosave) and to send a beat to a friend (share link).
Today edits are destructive and sharing relies on several individual URL params.
The design adds an in-app history stack, localStorage autosave/restore, and a
single compact base64 `?beat=` link that round-trips the whole beat.

## Scope

- **History**: a bounded undo/redo stack (cap ~40) of pattern + velocity (PR-33)
  + 808/melody pitch snapshots. Every mutating edit pushes a snapshot and clears
  redo. Wire the PR-32 undo/redo buttons and keyboard shortcuts
  (`Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z`, `Cmd/Ctrl+Y`), ignored while typing in an
  input/select/textarea. Buttons disable when the stack is empty.
- **Autosave**: debounced serialize of the full beat to `localStorage`
  (`rubl-beat-v1`); on load, restore autosaved (or shared) state if present.
- **Compact share**: a single base64-encoded `?beat=` param carrying the whole
  serialized beat; a "Share link" button copies the URL to the clipboard. Keep
  reading the existing individual params for backward compatibility.

## Acceptance criteria

- Undo/redo restore prior pattern/velocity/pitch state via buttons and keyboard;
  shortcuts are ignored while typing in a field; buttons disable at stack ends.
- Reloading the page restores the last autosaved beat.
- The Share button copies a `?beat=` URL that fully reconstructs the beat in a
  fresh tab; legacy param URLs still load.
- Deterministic tests cover the snapshot/undo/redo reducer, the serialize ↔
  deserialize round-trip (incl. velocity), base64 encode/decode, and
  backward-compat with legacy params.
