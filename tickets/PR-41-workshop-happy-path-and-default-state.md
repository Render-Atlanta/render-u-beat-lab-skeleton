# PR-41 - Workshop happy path and default state

**Type:** Teaching / UX
**Depends on:** PR-29, PR-32, PR-35
**Wave:** 5 (Workshop readiness)
**Related:** PR-25, PR-26 (producer tag), PR-34 (share/autosave)
**Source:** Codex workshop audit, 2026-06-21

## Context

The Luma workshop description frames the session around reusable AI workflows:
participants should leave with a concrete workflow they can reuse. Beat Lab can
support that story if the first-run path is obvious: choose a pocket, build a
basic beat, add a producer tag, play it, and export or share it.

The current deployed branch can do those things, but the default local state may
resume in guided mode with only one lane visible and an "Exit guided" nav state.
That is useful after a prior session, but risky for a live workshop demo or a new
attendee joining fresh.

## Scope

- Define a deterministic workshop entry mode, either via a route/query flag
  such as `?workshop=1` or a first-run reset affordance.
- Make the first screen clearly support the core workshop path:
  1. pick a style,
  2. add or edit hits,
  3. open Tag,
  4. test the tag,
  5. export/share.
- Add a compact "workshop checklist" or progress surface using existing panels
  or guided mode language. Avoid adding marketing copy or a landing page.
- Ensure guided mode persistence cannot surprise a workshop participant who
  opens the deployed URL for the first time.
- Include a producer-tag preset that is immediately audible in text mode and a
  clear path to record a tag when mic permissions are available.

## Acceptance criteria

- A clean browser profile opens into a predictable workshop-ready state.
- A returning browser can intentionally reset into workshop mode without clearing
  unrelated app capabilities.
- The user can complete the basic beat + producer tag path without being told
  where hidden controls live.
- The path works on desktop and mobile after PR-40.
- Existing guided mode behavior and preferences still work outside the workshop
  entry path.

