# Workshop AI Workflows

These workflows are the real teaching artifact behind Render U Beat Lab. The app
is the memorable hook; the repeatable process is what attendees should take home.

## Workflow 1: Feature slice

Use when starting any ticket that changes product behavior.

### Trigger

An issue has clear acceptance criteria, such as `#2 Editable step sequencer` or
`#5 Onset detection + quantization`.

### Inputs

- Issue number and ticket markdown from `tickets/`.
- Current relevant files.
- Existing tests.
- Design constraints from `README.md` and `SPEC.md`.

### Prompt

```md
Work on issue #<number>. First read the ticket and relevant files. Implement the
smallest complete slice that satisfies the acceptance criteria. Keep changes
scoped, add deterministic tests for non-UI logic, run tests and build, then
summarize the behavior changed and any remaining risk.
```

### Steps

1. Read the ticket and dependency notes.
2. Find the smallest files that own the behavior.
3. Add or update pure helpers before wiring UI.
4. Add tests around helpers, serialization, parsing, or classification.
5. Wire the UI.
6. Run `npm test` and `npm run build`.
7. Open a PR that closes the issue.

### Done criteria

- Acceptance criteria are met.
- Tests cover the risky logic.
- Build passes.
- PR body includes verification.

## Workflow 2: Audio debugging

Use when a feature is silent, late, noisy, or browser-specific.

### Trigger

Anything involving `src/audio/beatEngine.ts`, mic capture, scheduling, or
playback timing.

### Inputs

- Relevant audio code, especially `src/audio/beatEngine.ts`.
- UI component or hook that calls the audio behavior.
- Browser console observations.
- A short description of the audible failure: silent, late, distorted, noisy, or
  browser-specific.

### Prompt

```md
Debug the audio behavior without guessing. Identify whether the problem is
browser permission, autoplay policy, AudioContext state, scheduling, synthesis,
or UI state. Add a minimal diagnostic or test where possible, then remove noisy
debug output before finishing.
```

### Steps

1. Verify that a user gesture starts or resumes `AudioContext`.
2. Check that the browser supports the required API.
3. Trace the call path with the expected pattern, BPM, and swing values.
4. Make sure scheduled times are in the future.
5. Confirm failure states keep manual beat-making usable.
6. Remove temporary logs before opening the PR.

### Done criteria

- Root cause is named.
- Fix is smaller than the bug.
- Manual fallback still works.

## Workflow 3: Capture logic with fixtures

Use for `#5` and `#6`, where real microphone behavior is hard to test directly.

### Trigger

The feature needs to detect, quantize, or classify audio input from table taps or
beatboxing.

### Inputs

- Existing capture or audio helper code.
- Fixture arrays for quiet noise, clean taps, dense taps, and beatbox-like hits.
- Expected output shape: hit times, quantized steps, or drum lanes.
- Ticket acceptance criteria from `tickets/PR-05-*` or `tickets/PR-06-*`.

### Prompt

```md
Build the capture logic around fixture arrays first. Treat the microphone as an
input source, not the algorithm. Add tests for envelope creation, peak picking,
quantization, and lane classification before connecting it to UI controls.
```

### Steps

1. Create a pure helper in `src/lib/`.
2. Add synthetic fixtures for quiet noise, clean taps, and dense taps.
3. Test expected hit times or lanes.
4. Wire the helper into the mic flow.
5. Add a sensitivity control only after defaults work.

### Done criteria

- The algorithm can be tested without a microphone.
- The UI exposes manual correction.
- False positives are documented as tunable, not mysterious.

## Workflow 4: Design-system adherence

Use when adding or modifying UI.

### Trigger

Any ticket that changes layout, controls, panels, typography, copy, or visual
states.

### Inputs

- Current UI files, usually `src/App.tsx` and `src/styles.css`.
- Design notes from `README.md`.
- User-facing acceptance criteria from the ticket.
- Screenshots or browser smoke observations when available.

### Prompt

```md
Follow the RenderATL design language already in this repo. Use cream/ink/pink,
uppercase display type, eyebrow labels, sharp 6px corners, visible borders,
minimal shadows, and the star motif only for brand moments. Do not introduce
generic SaaS gradients, rounded pills, or in-app instructional prose that
explains the UI instead of making it usable.
```

### Steps

1. Keep the cream background as the default surface.
2. Use pink as one strong accent, not everywhere.
3. Preserve sharp corners on buttons and panels.
4. Check that text fits compact panels on mobile and desktop.
5. Match controls to expected UI patterns: buttons for commands, sliders for
   ranges, inputs for numbers, and grid cells for binary states.
6. Remove decorative feature descriptions that should instead become usable UI.

### Done criteria

- UI feels like the existing RenderATL demo system.
- New controls are usable without a paragraph of explanation.
- Mobile layout does not hide critical steps or controls.

## Workflow 5: Review before PR

Use before pushing any ticket branch.

### Trigger

A branch is code-complete and ready to become a pull request.

### Inputs

- Current branch diff.
- Linked issue and acceptance criteria.
- Test output.
- Browser smoke notes when UI changed.

### Prompt

```md
Review this branch like a senior engineer. Look for behavior regressions,
missing tests, state bugs, browser constraints, accessibility gaps, and places
where the implementation exceeds the ticket scope. Fix high-confidence issues,
then create the PR.
```

### Steps

1. Confirm `git diff --stat` matches the intended scope.
2. Check that tests are focused and deterministic.
3. Run `npm test`.
4. Run `npm run build`.
5. Run a browser smoke check when UI changed.
6. Create a PR body with summary, verification, and linked issue.

### Done criteria

- No unrelated refactors.
- No hidden dependency on a local-only state.
- PR is reviewable in one sitting.

## Recommended parallel lanes

After `#1` is complete, these lanes can move independently:

- Product lane: `#2 Editable step sequencer`
- Teaching lane: `#3 Beat coach learning layer`
- Capture lane: `#4 Microphone capture spike`
- Polish lane: `#7 Producer tag`
- Delivery lane: `#9 Render static deploy`
- Process lane: `#10 Workshop AI workflow prompts`

The later work is intentionally gated:

- `#5` waits on `#4`.
- `#6` waits on `#5`.
- `#8` waits on `#2` and `#7`.

## Instructor move

During the workshop, show the app first. Then show the workflow that made it
manageable:

```md
We did not ask AI to "make a beat machine" and hope. We gave it a spec, a design
system, a ticket, acceptance criteria, and a verification loop. That is the
difference between vibe coding and reusable AI engineering.
```
