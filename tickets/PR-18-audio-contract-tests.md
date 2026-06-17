# PR-18 - Audio contract tests

**Type:** Quality  
**Depends on:** PR-11

## Context

Once there are multiple audio engines, tests should verify shared behavior
without depending on the exact implementation. Contract tests make the Web Audio
and Tone.js engines interchangeable from the app's point of view.

## Scope

- Define shared contract tests for play, stop, tempo updates, pattern updates,
  swing updates, and cleanup.
- Use fake clocks or mocked scheduler hooks where possible.
- Add a lightweight fake audio engine for UI tests.
- Document which behaviors are contract-level versus implementation-specific.

## Acceptance criteria

- Any engine adapter can run the same contract test suite.
- UI tests can use a fake engine instead of real browser audio.
- Timing-sensitive tests are deterministic in CI.
- Adding Tone.js does not require rewriting existing app tests.
