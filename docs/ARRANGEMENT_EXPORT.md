# Arrangement + Export

`src/lib/arrangement.ts` owns the pure project helpers for PR-08. The UI can
compose these helpers without coupling arrangement logic to React state.

## Sections

The default arrangement is four one-bar sections in playback order:

- `intro`
- `main`
- `variation`
- `outro`

Each section carries `mutedLanes`, which can contain `kick`, `snare`, `hat`, and
`openHat`. Use `setSectionLaneMuted` or `toggleSectionLaneMute` to update mutes
immutably, then use `createArrangementPlaybackSections` to get each section's
pattern with its muted lanes removed.

## Project JSON

Project exports use this top-level shape:

```json
{
  "kind": "render-u-beat-lab/project",
  "version": 1,
  "sequencer": {},
  "producerTag": {},
  "arrangement": {}
}
```

`exportProjectJson` normalizes and serializes a project. `importProjectJson`
parses JSON and returns either `{ "ok": true, "project": ... }` or
`{ "ok": false, "errors": [...] }`, so UI import flows can report validation
problems without throwing.

## WAV Export

Offline WAV rendering is still a stretch goal. `createUnsupportedWavExportResult`
returns a deterministic unsupported result that can back a disabled/export-later
UI state until the browser audio render path is stable.
