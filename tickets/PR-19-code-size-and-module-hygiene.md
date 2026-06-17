# PR-19 - Code size and module hygiene

**Type:** Quality  
**Depends on:** PR-16, PR-17

## Context

The workshop code should be easy to inspect live. Large files and mixed
responsibilities make agent-driven review harder and slow down learner
comprehension.

## Scope

- Add a simple module hygiene check for maximum file length or exported
  responsibility count.
- Document acceptable exceptions for generated files, fixture data, and CSS.
- Create a short `docs/CODE_QUALITY.md` guide for composable functions,
  component boundaries, and test expectations.
- Add npm scripts so quality checks can run with the normal test/build flow.

## Acceptance criteria

- The repo has a documented target for small files and focused modules.
- The quality check fails with a clear message when a source file grows beyond
  the agreed threshold.
- Existing large files are either split or explicitly listed as temporary
  exceptions with follow-up notes.
- The guide gives contributors concrete examples from this codebase.
