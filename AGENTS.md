# render-u-beat-lab-skeleton Agent Instructions

## Repo Map

React 19 + Vite + TypeScript beat maker; audio in `src/audio/`, logic in `src/lib/`, components in `src/components/`. Beat styles live in `src/lib/beatStyles.ts`.

## How to Run

```sh
npm install
npm run dev     # local dev server
npm test        # vitest suite
npm run check   # the gate — hygiene + typecheck:scripts + vitest, all must pass
```

`npm run check` is the existing gate for this repo. It is not something this harness adds — treat it as the ground truth for "done."

## Read First

This repo is too large to hold in context — read these before making changes, not this file alone:

- `docs/AI_WORKFLOWS.md` — the repeatable process for taking a ticket from acceptance criteria to a passing gate.
- `docs/CODE_QUALITY.md` — the **300-line module rule** (350 for tests), enforced by `npm run hygiene` (part of `npm run check`). Keep any file you touch or create under this limit.

## Active Feature: Restore the Amapiano Style

The amapiano style pattern has been carved out to a stub. Design and implement a valid amapiano pattern that satisfies its property spec.

**Scope boundary:** Edit only `src/lib/beatStyles.ts` (the amapiano entry). Do NOT touch the audio engine, `StyleSelector`, coach copy, or any other style.

Full detail (target files, acceptance, gate) lives in `feature_list.json` under `restore-amapiano-style` — that file is the source of truth if this section and `feature_list.json` ever disagree.

## Definition of Done

`npm run check` green + a `PROGRESS.md` note.

## Acceptance

The acceptance check is `src/lib/beatStyles.amapiano.test.ts` — a property-based test (clap + 808 present, kick on step 1, hats present, bpm 108-116, swing >= 0.10, hit count 14-28, non-empty lesson), not a fixed golden pattern. Any amapiano pattern that satisfies the properties passes.
