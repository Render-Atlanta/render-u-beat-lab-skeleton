# PR-15 - Reference profile analyzer

**Type:** Tooling  
**Depends on:** PR-03

## Context

Reference songs help non-producers understand why a style preset feels right or
wrong. A small offline analyzer can turn legally referenced metadata and
research notes into style profiles without copying copyrighted recordings into
the app.

References:

- librosa docs: https://librosa.org/doc/latest/index.html
- librosa beat tracking: https://librosa.org/doc/latest/beat.html

## Scope

- Add an optional local analysis script for tempo, onset density, and rough beat
  placement from user-provided audio files.
- Output JSON profiles that can be reviewed before adding to
  `styleReferences`.
- Document that audio files are not committed and that generated profiles are
  educational metadata only.
- Add fixture-based tests for the profile normalization logic.

## Acceptance criteria

- A developer can run the analyzer locally against their own audio file.
- The repo does not include copyrighted reference audio.
- Generated profile JSON includes BPM, feel BPM when relevant, density, and
  plain-English notes.
- Tests cover profile validation without requiring real songs.
