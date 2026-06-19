# PR-29 — Guided "build it up" layering mode (design)

**Ticket:** `tickets/PR-29-guided-layering-mode.md` (issue #43)
**Type:** Teaching · **Wave:** 3 · **Depends on:** PR-23 (role coaching copy), PR-27 (clap/808 lanes)
**Status:** Approved design — ready for implementation plan.

## Problem

The beat lab now shows all seven lanes (kick, snare, hat, open, clap, 808,
melody) at once — PR-28's melody lane merged to `main` (`036fbe7`) before this
branch was cut, so it is already the final lane. A blank or full multi-lane grid
is exactly the option-paralysis the beginner research warns against. We need an
optional **guided mode** that introduces lanes one at a time — each with a short
role explanation — so an absolute beginner is never staring at everything at
once, can hear the beat *build up* layer by layer, and can drop into the full
free-form grid whenever they want.

Research basis: scaffolded, one-concept-at-a-time progression and "learn each
instrument, then combine" (Ableton Learning Music Playground); deliberate option
reduction (Groove Pizza).

## Decisions (locked)

1. **Introduced lanes start pre-filled, then author.** When guided mode reveals a
   lane it carries the style's default preset hits, so the beginner immediately
   hears it working and then tweaks. Guided mode reuses the normal preset; it
   only hides lanes, never blanks them.
2. **Progressive reveal inside the existing grid.** No separate wizard/overlay. A
   guide banner sits above the existing `SequencerPanel`; only introduced lanes
   render; the rest are hidden until unlocked.
3. **Hidden lanes are silent, not just invisible.** The value of "build it up" is
   *hearing* each layer added, so not-yet-revealed lanes are masked out of the
   audible/playable pattern (audio + EQ + fidelity meter). The stored pattern is
   never mutated, so exiting restores the full beat instantly.
4. **Preference persists in `localStorage`**, not the URL. Guided-vs-free is
   per-device UI state, not part of the shareable beat, so share links stay
   purely about the pattern. Key: `beatlab.guidedMode`. **Absent key ⇒ first-time
   visitor ⇒ guided.**
5. **Sequence derives from `INSTRUMENTS` array order** (kick → snare → hat → open
   → clap → 808 → melody), one lane per step. Single source of truth: because
   `melody` is already the last entry in `INSTRUMENTS`, it is automatically the
   final guided step, and any future lane added to `INSTRUMENTS` joins the
   sequence with no extra wiring. (The ticket's "clap/808" grouping was an
   example; one-lane-per-step is simpler and fully data-driven.)

## Architecture

A pure domain module owns all logic; a presentational banner renders the guide
strip; `SequencerPanel` gains one prop to filter visible lanes; `App` owns the
state and a thin `localStorage` helper. **No audio-engine changes.**

### Units

1. **`src/lib/guidedMode.ts`** — pure, fully unit-tested. No React, no DOM.
   - `getGuidedSequence(): InstrumentId[]` → `INSTRUMENTS.map((i) => i.id)`.
   - `GuidedModeState = { active: boolean; stepIndex: number }`.
   - Transitions (each returns a new clamped state):
     - `startGuidedState(): GuidedModeState` → `{ active: true, stepIndex: 0 }`.
     - `advanceGuidedStep(state): GuidedModeState` → next step; advancing past the
       last step deactivates (reveals everything): `{ active: false, stepIndex: last }`.
     - `skipGuided(state): GuidedModeState` → `{ active: false, stepIndex: last }`
       (reveal all, leave guided).
     - `exitGuided(state): GuidedModeState` → `{ active: false, stepIndex }`.
   - `getRevealedLaneIds(state): InstrumentId[]` →
     `state.active ? sequence.slice(0, state.stepIndex + 1) : sequence`.
   - `isLastGuidedStep(state): boolean` → for Next-vs-Finish button copy.
   - `maskPatternToLanes(pattern, revealedIds): Pattern` → clones the pattern with
     any lane **not** in `revealedIds` set to all-`false`. Does **not** mutate the
     input. Revealed lanes are copied through unchanged.
2. **`src/lib/guidedModePrefs.ts`** — `localStorage` access, isolated so it can be
   tested with an injected/faked storage and so failures are swallowed.
   - `GuidedPref = "guided" | "free"`.
   - `readGuidedPref(storage?): GuidedPref` → reads `beatlab.guidedMode`; absent or
     unknown ⇒ `"guided"` (first-time default); any thrown error ⇒ `"guided"`.
   - `writeGuidedPref(pref, storage?): void` → writes the key; swallows errors
     (private mode / storage disabled) so the UI never crashes.
   - `storage` param defaults to `window.localStorage`, injectable for tests.
3. **`src/components/GuidedModeBanner.tsx`** — presentational.
   - Props: `instrument: InstrumentOption`, `stepIndex: number`, `stepCount: number`,
     `isLastStep: boolean`, `onNext`, `onSkip`, `onExit`.
   - Renders `Step {n} of {N} — {label}` plus the lane's `role` and `explainer`
     (the PR-23 copy already in `instruments.ts`).
   - Buttons: **Next** (label becomes **Finish** when `isLastStep`), **Skip to
     full grid**, **Exit**.
4. **`SequencerPanel`** — one change: new optional prop
   `visibleInstruments?: InstrumentOption[]` defaulting to the full `INSTRUMENTS`
   constant. The lane `.map(...)` iterates `visibleInstruments` instead of the
   imported constant. Everything else (volume, pitch, playhead) is unchanged.
   When the prop is omitted or full, output is identical to today.
5. **`App`** — orchestration only.
   - `const [guidedState, setGuidedState] = useState<GuidedModeState>(() =>
     readGuidedPref() === "guided" ? startGuidedState() : { active: false, stepIndex: getGuidedSequence().length - 1 })`.
   - `revealedLaneIds = useMemo(() => getRevealedLaneIds(guidedState), [guidedState])`.
   - `visibleInstruments = useMemo(() => INSTRUMENTS.filter((i) => revealedLaneIds.includes(i.id)), [revealedLaneIds])`.
   - `playableStyle` is built from `guidedState.active
     ? maskPatternToLanes(sequencer.pattern, revealedLaneIds) : sequencer.pattern`
     (then through the existing `createPlayableStyle`). Audio, EQ, and the fidelity
     meter all follow the audible build.
   - Handlers `handleGuidedNext / handleGuidedSkip / handleGuidedExit / handleGuidedStart`
     update state and call `writeGuidedPref("guided" | "free")` accordingly.
   - Renders `<GuidedModeBanner …>` when `guidedState.active`, otherwise a slim
     "▸ Start guided build" button as the re-entry point.

### Data flow

```
localStorage(beatlab.guidedMode) ──read──▶ App.guidedState
                                              │
                          getRevealedLaneIds ─┤
                                              ├─▶ visibleInstruments ─▶ SequencerPanel (renders subset)
                                              └─▶ maskPatternToLanes ──▶ playableStyle ─▶ engine / EQ / fidelity
Next/Skip/Exit/Start ─▶ guidedMode transition ─▶ setGuidedState + writeGuidedPref
```

## Acceptance-criteria mapping

| Criterion | Satisfied by |
|---|---|
| First-time / opted-in user walked through enabling layers one at a time with role explanations | `readGuidedPref` default + progressive reveal + `GuidedModeBanner` using `instruments.ts` copy |
| Exit to full grid at any point and re-enter guided mode | Skip/Exit buttons + "Start guided build" re-entry; stored pattern untouched ⇒ lossless exit |
| Free-form behavior unchanged when guided mode is off | `visibleInstruments` defaults to all; no masking when `!active` |
| Layer sequence defined in data, not hard-coded UI branches | `getGuidedSequence()` derives from `INSTRUMENTS` |

## Testing (deterministic — no `Math.random` / `Date.now`)

- **`guidedMode.test.ts`** — sequence order matches `INSTRUMENTS`; `startGuidedState`;
  `advanceGuidedStep` across every step incl. the final advance that deactivates;
  `skipGuided` / `exitGuided`; `getRevealedLaneIds` for active and inactive states;
  `isLastGuidedStep`; `maskPatternToLanes` zeroes hidden lanes, preserves revealed
  lanes, and does not mutate its input.
- **`guidedModePrefs.test.ts`** — absent key ⇒ `"guided"`; round-trip write/read via
  an injected fake storage; `read`/`write` swallow a throwing storage and fall back
  to `"guided"` / no-op.
- **`GuidedModeBanner.test.tsx`** — renders the current step's label/role/explainer;
  Next/Skip/Exit invoke the right callbacks; button reads **Finish** on the last step.
- **`SequencerPanel.test.tsx`** — new case: only `visibleInstruments` rows render;
  existing full-grid case still passes (omitted prop ⇒ all six lanes).

## Out of scope (YAGNI)

- Resuming guided mode at the last-seen step on re-entry (re-entry restarts at step 1).
- Per-style guided sequences (one global order derived from `INSTRUMENTS`).
- Any audio-engine, serialization, or URL-state change.
- Grouping multiple lanes into a single guided step.

## Note (#42 melody lane already merged)

PR-28 (melody, #42) merged to `main` as `036fbe7` before this branch was cut, so
there is no parallel-conflict risk. The guided sequence already includes `melody`
as its seventh/final step via `INSTRUMENTS`. Melody's extra per-step pitch UI is
keyed on `instrument.id === "melody"` inside `SequencerPanel`, so filtering the
rendered lane list does not affect it.

## Gate

`npm run check` (hygiene + scripts typecheck + full vitest) green before any task
is considered done.
