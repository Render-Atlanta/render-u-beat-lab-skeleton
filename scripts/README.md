# Developer scripts

## analyze-reference

Offline reference profile analyzer (PR-15). Turns a WAV file you own into a
**draft** style profile for review before hand-adding to
`src/lib/styleReferences.ts`.

```bash
npm run analyze:reference -- path/to/loop.wav
npm run analyze:reference -- loop.wav --out loop.profile.json --artist "X" --title "Y" --source "https://..."
```

Output is a JSON draft with `bpm`, optional `feelBpm`, a `swing` label
(defaults to `straight` — adjust by ear), a plain-English `profile` note, and a
`measured` block of raw numbers (detected tempo, confidence, onset density).

### feelBpm

The analyzer only auto-suggests `feelBpm` when the detected tempo is ≥ 140 BPM (common in drum-and-bass and fast hip-hop). Slower half-time material (e.g. ~120–135 BPM R&B) will have `feelBpm` omitted from the draft — add it by ear before copying the profile into `STYLE_REFERENCES`.

### Important

- **Audio files are never committed.** Scratch inputs go in `reference-audio/`
  (git-ignored). Generated `*.profile.json` files are git-ignored too.
- Generated profiles are **educational metadata only** — review and edit them,
  then copy the clean `bpm` / `feelBpm` / `swing` / `profile` fields into
  `STYLE_REFERENCES` by hand. The tool never writes into the app.
- WAV only. Convert other formats first: `ffmpeg -i in.mp3 out.wav`.
