# render-u-beat-lab-skeleton Harness Progress

Add one entry per implementation or verification pass. Newest entry on top.

## Session — restore-amapiano-style (complete)

- Feature: `restore-amapiano-style`
- Command run: `npm run check` (hygiene → typecheck:scripts → vitest)
- Result: **PASS** — `Test Files 111 passed | 1 skipped (112)`, `Tests 734 passed | 38 skipped (772)`, hygiene OK, exit 0.

  The baseline this came FROM was **RED**, and that red was the spec, not a broken
  setup. On `workshop-starter` the same gate reported `Test Files 1 failed | 110
  passed | 1 skipped (112)` / `Tests 3 failed | 731 passed | 38 skipped (772)` —
  confined to `src/lib/beatStyles.amapiano.test.ts` and nothing else. Three
  failures there, zero anywhere else, is what "the feature is missing" looks like
  in a healthy repo. Going 3 failed → 0 failed while the other 731 stayed green is
  the actual evidence that the feature landed and nothing else moved.

- Files changed:
  - `src/lib/beatStyles.ts` — the `amapiano` entry only: replaced the empty stub
    pattern with a real one (kick on 1 + 9/12/15, snare and clap on 5/13, rolling
    hats, open hats answering off-grid, 808 tracking the kick), and wrote the
    lesson string. 23 active hits.
  - Harness files authored this session (the repo had none): `AGENTS.md`,
    `feature_list.json`, `PROGRESS.md`, `init.sh`, `verification.md`.

  Nothing else. The scope boundary said edit only `src/lib/beatStyles.ts`, and the
  gate went green without touching a single test or fixture. If you find yourself
  editing `beatStyles.golden.test.ts` or `beatStyleFixtures.ts` to get green, stop
  — that is moving the goalposts, not passing the gate.

- Remaining risk: **this pattern is one of many valid ones.** The acceptance in
  `src/lib/beatStyles.amapiano.test.ts` is property-based (clap + 808 present, kick
  on step 1, hats present, bpm 108–116, swing ≥ 0.10, 14–28 hits, non-empty lesson)
  — not an exact-grid golden. Green means "satisfies the properties," not "matches
  some original." Amapiano is deliberately excluded from the exact-grid golden
  fixture lock for exactly this reason. A musician may still hear this groove as
  mediocre; the gate cannot tell you that, and no gate can. Taste is not in scope
  for the harness — knowing that the harness cannot check it IS in scope.

- Next feature candidate: `restore-second-style` (status `backlog` in
  `feature_list.json`) — a second carved style, same loop: read the acceptance
  test, implement inside the scope boundary, run the gate, log the result here.

## Session

- Feature:
- Command run:
- Result:
- Files changed:
- Remaining risk:
- Next feature candidate:
