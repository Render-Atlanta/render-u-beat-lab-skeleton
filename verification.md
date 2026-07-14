# Beat Lab Verification — Reference

## The Gate

```sh
npm run check
```

`npm run check` is `npm run hygiene && npm run typecheck:scripts && npm test`.
**You did not write this. It already existed, and this repo's CI depends on it.**
That is the point: the gate was here the whole time, and the agent had no idea.

Measured on a clean `workshop-starter` clone: **~4 seconds** end to end. Cheap
enough to run after every change, which is the only reason anyone runs one.

## The Gate Short-Circuits

`hygiene && typecheck:scripts && npm test` — the `&&` matters. A failed
typecheck means **vitest never runs**. You get no test signal at all, not a
green one.

> A failure upstream hides every signal downstream of it. An early red does not
> tell you the tests passed; it tells you the tests did not happen.

## What "Green" Means Here

The baseline is **RED** — on `src/lib/beatStyles.amapiano.test.ts` and nothing
else (`3 failed | 731 passed | 38 skipped`). Red is the starting line. Red is
the work. This is the inverse of a sandbox repo, and it is what a real one
actually looks like when a feature is missing.

Done is: `npm run check` green **and** a `PROGRESS.md` entry. A green `npm test`
alone is not the gate — the gate is the full three-part command.

## Acceptance

`src/lib/beatStyles.amapiano.test.ts` is **property-based**, not an exact-grid
golden. Clap and 808 both present; kick on step 1; hats present; bpm 108-116;
swing >= 0.10; 14-28 total active hits across the whole kit; a non-empty lesson
string. Any pattern satisfying those passes — there is no original to
reverse-engineer.

## Completion Evidence

Record in `PROGRESS.md`: command run, result, files changed, remaining risk,
next feature candidate.
