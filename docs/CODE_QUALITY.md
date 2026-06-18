# Code quality and module hygiene

This workshop code should be easy to read live and easy for an agent to review.
Small, single-purpose files are the cheapest way to keep both true. This guide
states the size target, how it is enforced, and how to handle exceptions.

## File-size target

| File kind | Limit | Why |
| --- | --- | --- |
| Source (`*.ts`, `*.tsx`) | **300 lines** | A file you can scroll in one or two screens during a demo. Most modules here are well under 150 lines. |
| Test (`*.test.ts`, `*.test.tsx`) | **350 lines** | Tests legitimately repeat setup and inline fixtures, so they get a little more room. |

300 lines is a deliberate, defensible default: comfortably above the median
module in this repo (~100 lines) so it does not nag good code, but low enough to
flag files that have quietly grown two or three responsibilities. Trailing blank
lines are ignored, so a final newline never tips a file over.

### What is checked, and what is not

The check is **line-count only**. We considered an "exported responsibility
count" heuristic but a trustworthy version needs a real TypeScript parser to
avoid false positives from type-only exports, re-exports, and barrel files. A
flaky check is worse than none, so we kept this one thin and reliable. Line
count is a good proxy: files with too many responsibilities are almost always
too long as well.

Only `src/**/*.{ts,tsx}` is scanned. Generated files, fixture data outside
`src`, JSON, and CSS are out of scope by construction (the scanner only walks
`src` and only matches `.ts`/`.tsx`).

## Running the check

```bash
npm run hygiene   # just the size check
npm run check     # hygiene + typecheck:scripts + tests, the full quality pass
```

`npm run build` also runs `hygiene` first, so an oversized file fails the build.
The check exits non-zero and prints every offending file with its line count and
the limit that applies.

## Exceptions policy

Some files are large today and splitting them in this PR would be risky. They are
listed as **temporary** exceptions in the `ALLOWLIST` in
[`scripts/moduleHygiene.ts`](../scripts/moduleHygiene.ts), each with a one-line
follow-up note. An allowlist entry is a promise to split later, not a permanent
pass.

Rules:

- A **new** file over the limit fails the check. The allowlist only excuses the
  specific files listed.
- When an allowlisted file is split back under the limit (or deleted), the check
  prints a "stale allowlist entry" warning so the list stays honest. Remove the
  entry.
- Prefer splitting over adding a new exception. Add an exception only when a
  split would be unsafe in the current change.

Current temporary exceptions (split these later):

| File | Lines | Follow-up |
| --- | --- | --- |
| `src/lib/arrangement.ts` | ~602 | Split arrangement build vs. export/serialization helpers. |
| `src/lib/micCapture.ts` | ~442 | Extract permission/stream plumbing from the capture loop. |
| `src/App.tsx` | ~403 | Lift panel wiring into smaller container components. |
| `src/lib/onsetDetection.ts` | ~401 | Separate windowing/FFT helpers from onset scoring. |
| `src/lib/beatboxClassifier.ts` | ~326 | Move feature-extraction tables into their own module. |

## Writing focused modules

A few habits keep files small and reviewable:

- **Composable, pure functions over big procedures.**
  [`src/lib/sequencerDomain.ts`](../src/lib/sequencerDomain.ts) is the model: a
  handful of small, pure helpers (`updateSequencerBpm`, `clampSwingPercent`,
  `getSequencerLoopDurationMs`) that each do one thing and are trivial to test.
  Aim for that shape.
- **Split domain logic out of components.** UI components should wire state and
  render; the rules they enforce belong in a `lib` module. `SequencerPanel.tsx`
  (~106 lines) stays small precisely because clamping and loop-timing math live
  in `sequencerDomain.ts`.
- **One responsibility per module.** When a file starts answering more than one
  question ("how do I build an arrangement" *and* "how do I serialize it"),
  that is the signal to split - exactly the follow-up noted for
  `arrangement.ts`.

## Test expectations

- Co-locate tests next to the code as `*.test.ts` (the Vitest include glob is
  `src/**/*.test.ts`). See `src/lib/sequencerDomain.test.ts` for the style.
- Test the pure logic directly. Helpers like the hygiene check live in a thin
  module (`scripts/moduleHygiene.ts`) with the CLI wrapper kept separate, so the
  logic is covered by `src/test/moduleHygiene.test.ts` without touching disk.
- Keep tests deterministic - no real timers, audio, or network.
