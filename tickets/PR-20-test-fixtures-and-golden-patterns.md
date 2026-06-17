# PR-20 - Test fixtures and golden patterns

**Type:** Quality  
**Depends on:** PR-03, PR-06

## Context

As styles, references, beatbox analysis, and sample engines expand, tests need
shared fixtures that describe known-good patterns and expected summaries. This
keeps tests readable and prevents drift between style data, UI copy, and audio
behavior.

## Scope

- Create shared test fixtures for style presets, serialized patterns, beatbox
  hits, and reference profiles.
- Add golden tests for each style's default pattern and key teaching summary.
- Reuse fixtures across pattern, beat coach, reference, and audio contract tests.
- Keep fixtures small and named after the behavior they prove.

## Acceptance criteria

- Adding a new style requires updating one obvious fixture set.
- Tests fail clearly when a preset changes without updating expected summaries.
- Fixture data is separated from production data unless the test intentionally
  validates production data.
- Existing tests become shorter or easier to read after fixture extraction.
