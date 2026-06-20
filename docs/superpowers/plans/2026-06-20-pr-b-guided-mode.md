# PR-B — More-instructive Guided Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make guided mode more instructive — add a per-lane `guidedTip`, restore the brief's "← Previous layer" navigation and "earlier layers stay live" coaching line.

**Architecture:** Add `guidedTip` to `InstrumentOption` (single source of copy); add a pure `retreatGuidedStep` mirroring `advanceGuidedStep`; render the new copy + Previous button in `GuidedModeBanner`; wire `onPrevious` in `App`.

**Tech Stack:** React, TypeScript, Vitest (`renderToStaticMarkup` string assertions).

## Global Constraints
- Gate: `npm run check` + `npx tsc --noEmit`. No CI. CodeRabbit non-blocking.
- `guidedTip` copy stays beginner-first and concrete (an interaction hint).
- Files stay under the 300-line hygiene limit (350 for tests).

---

### Task 1: `guidedTip` field + copy (`instruments.ts`)

**Files:** Modify `src/lib/instruments.ts`; Test `src/lib/instruments.test.ts` (create if absent).

- [ ] **Step 1: Failing test** — assert every instrument has a non-empty `guidedTip`:
```ts
import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./instruments";

describe("INSTRUMENTS guidedTip", () => {
  it("every lane has a non-empty guided tip", () => {
    for (const instrument of INSTRUMENTS) {
      expect(typeof instrument.guidedTip).toBe("string");
      expect(instrument.guidedTip.length).toBeGreaterThan(0);
    }
  });
});
```
- [ ] **Step 2:** Run `npx vitest run src/lib/instruments.test.ts` → FAIL (guidedTip undefined / type error).
- [ ] **Step 3:** Add `guidedTip: string` to `InstrumentOption`, and a `guidedTip` to each entry:
  - kick: "Lands on the main beats — the pulse everything else answers to."
  - snare: "Put it on beats 2 and 4 to answer the kick. Tap those two first."
  - hat: "Fills the gaps. Every step = busy; every other step = laid back."
  - openHat: "One or two per bar adds lift — great right before the next bar."
  - clap: "Stack it on the snare to fatten the backbeat."
  - 808: "The sub-bass. Pitch it to follow your root note for movement."
  - melody: "An in-key hook. A few notes go a long way."
- [ ] **Step 4:** Run test → PASS.
- [ ] **Step 5:** Commit `PR-B: add per-lane guidedTip copy`.

### Task 2: `retreatGuidedStep` (`guidedMode.ts`)

**Files:** Modify `src/lib/guidedMode.ts`; Test `src/lib/guidedMode.test.ts`.

- [ ] **Step 1: Failing test:**
```ts
it("retreatGuidedStep steps back, clamped at the first lane", () => {
  expect(retreatGuidedStep({ active: true, stepIndex: 2 })).toEqual({ active: true, stepIndex: 1 });
  expect(retreatGuidedStep({ active: true, stepIndex: 0 })).toEqual({ active: true, stepIndex: 0 });
});
it("retreatGuidedStep is the inverse of advanceGuidedStep mid-sequence", () => {
  const s = { active: true, stepIndex: 2 } as const;
  expect(retreatGuidedStep(advanceGuidedStep(s))).toEqual(s);
});
```
(Import `retreatGuidedStep` + `advanceGuidedStep`.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement:
```ts
/** Step back to the previous lane; clamped at the first lane. */
export function retreatGuidedStep(state: GuidedModeState): GuidedModeState {
  if (!state.active) {
    return state;
  }
  return { active: true, stepIndex: Math.max(0, state.stepIndex - 1) };
}
```
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `PR-B: add retreatGuidedStep`.

### Task 3: Banner copy + Previous button (`GuidedModeBanner.tsx`)

**Files:** Modify `src/components/GuidedModeBanner.tsx`; Test `src/components/GuidedModeBanner.test.tsx`; `src/styles.css` (minor).

**Interfaces:** add `onPrevious: () => void` to `GuidedModeBannerProps`.

- [ ] **Step 1: Failing tests** (append):
```tsx
it("shows the guided tip and the earlier-layers coaching line", () => {
  const html = renderToStaticMarkup(
    <GuidedModeBanner instrument={kick} stepIndex={1} stepCount={INSTRUMENTS.length}
      isLastStep={false} onNext={noop} onPrevious={noop} onSkip={noop} onExit={noop} />,
  );
  expect(html).toContain(kick.guidedTip);
  expect(html).toContain("Earlier layers stay live");
  expect(html).toContain("Previous layer");
});
it("disables Previous on the first step", () => {
  const html = renderToStaticMarkup(
    <GuidedModeBanner instrument={kick} stepIndex={0} stepCount={INSTRUMENTS.length}
      isLastStep={false} onNext={noop} onPrevious={noop} onSkip={noop} onExit={noop} />,
  );
  expect(html).toMatch(/Previous layer[\s\S]*?disabled|disabled[\s\S]*?Previous layer/);
});
```
(Existing banner tests must add `onPrevious={noop}` to keep compiling.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: add `onPrevious` prop; render `<p className="guided-banner__tip">{instrument.guidedTip}</p>` after the explainer; render `<p className="guided-banner__live">★ Earlier layers stay live — tap any lane above to edit it.</p>`; add a "← Previous layer" button (`disabled={stepIndex === 0}`) before the Next button.
- [ ] **Step 4:** Run → PASS. Add minimal CSS for `.guided-banner__tip` / `.guided-banner__live` if needed.
- [ ] **Step 5:** Commit `PR-B: guided banner tip, earlier-layers line, previous button`.

### Task 4: Wire `onPrevious` in `App.tsx`

**Files:** Modify `src/App.tsx`.

- [ ] **Step 1:** Add handler after `handleGuidedNext`:
```ts
function handleGuidedPrevious() {
  changeGuidedState(retreatGuidedStep(guidedState));
}
```
- [ ] **Step 2:** Import `retreatGuidedStep` from `./lib/guidedMode`; pass `onPrevious={handleGuidedPrevious}` to `<GuidedModeBanner>`.
- [ ] **Step 3:** Run `npx tsc --noEmit && npm run check` → green.
- [ ] **Step 4:** Commit `PR-B: wire previous-layer handler`.

## Self-review
- Spec coverage: guidedTip ✓, Previous button ✓, earlier-layers line ✓.
- Type consistency: `retreatGuidedStep`, `onPrevious`, `guidedTip` used consistently.
