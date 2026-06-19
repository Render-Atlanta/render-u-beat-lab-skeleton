# PR-29 — Guided "build it up" layering mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional guided mode that introduces the seven lanes one at a time — each with its role explanation — so a beginner builds (and hears) the beat layer by layer, and can drop into the full free-form grid at any time.

**Architecture:** A pure domain module (`guidedMode.ts`) owns the sequence + state transitions + a non-mutating pattern mask; a thin `localStorage` helper (`guidedModePrefs.ts`) persists the guided-vs-free preference; a presentational `GuidedModeBanner` renders the guide strip; `SequencerPanel` gains one optional prop to filter visible lanes; `App` wires it together and masks the audible pattern while guided. No audio-engine, serialization, or URL-state changes.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (environment `node`, tests via `react-dom/server` `renderToStaticMarkup` — no DOM/testing-library, no `localStorage` global).

## Global Constraints

- **Determinism:** no `Math.random()` / `Date.now()` in code, tests, or fixtures.
- **Sequence is data-driven:** the guided order is `INSTRUMENTS.map(i => i.id)` — never a hard-coded lane list in UI branches.
- **Free-form behavior is byte-for-byte unchanged when guided mode is off:** the new `SequencerPanel` prop defaults to the full `INSTRUMENTS`; no masking when `!active`.
- **Hidden lanes are silent:** masking is applied to the *playable* pattern only; `sequencer.pattern` is never mutated.
- **Persistence:** `localStorage` key `beatlab.guidedMode`, values `"guided"` | `"free"`; absent/unknown/throwing ⇒ `"guided"` (first-time default). Never throw out of the prefs helper.
- **Tests must not depend on a `window`/`localStorage` global** (vitest env is `node`): inject a fake `Storage` instead.
- **Gate for every task:** `npm run check` (hygiene + scripts typecheck + full vitest) must be green. New source files must stay under 300 lines (`App.tsx` is already allowlisted).

---

### Task 1: `guidedMode.ts` — sequence, state transitions, reveal + mask (pure logic)

**Files:**
- Create: `src/lib/guidedMode.ts`
- Test: `src/lib/guidedMode.test.ts`

**Interfaces:**
- Consumes: `INSTRUMENTS` from `./instruments`; `clonePattern` from `./patternState`; `InstrumentId`, `Pattern` from `./patterns`.
- Produces:
  - `interface GuidedModeState { active: boolean; stepIndex: number }`
  - `getGuidedSequence(): InstrumentId[]`
  - `startGuidedState(): GuidedModeState`
  - `advanceGuidedStep(state: GuidedModeState): GuidedModeState`
  - `skipGuided(state: GuidedModeState): GuidedModeState`
  - `exitGuided(state: GuidedModeState): GuidedModeState`
  - `isLastGuidedStep(state: GuidedModeState): boolean`
  - `getRevealedLaneIds(state: GuidedModeState): InstrumentId[]`
  - `maskPatternToLanes(pattern: Pattern, revealedIds: InstrumentId[]): Pattern`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guidedMode.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./instruments";
import { BEAT_STYLES } from "./beatStyles";
import { clonePattern } from "./patternState";
import {
  advanceGuidedStep,
  exitGuided,
  getGuidedSequence,
  getRevealedLaneIds,
  isLastGuidedStep,
  maskPatternToLanes,
  skipGuided,
  startGuidedState,
  type GuidedModeState,
} from "./guidedMode";

const SEQUENCE = INSTRUMENTS.map((instrument) => instrument.id);
const LAST = SEQUENCE.length - 1;

describe("getGuidedSequence", () => {
  it("mirrors the INSTRUMENTS order exactly", () => {
    expect(getGuidedSequence()).toEqual(SEQUENCE);
  });
});

describe("guided state transitions", () => {
  it("starts active on the first lane", () => {
    expect(startGuidedState()).toEqual({ active: true, stepIndex: 0 });
  });

  it("advances one step at a time", () => {
    expect(advanceGuidedStep({ active: true, stepIndex: 0 })).toEqual({
      active: true,
      stepIndex: 1,
    });
  });

  it("deactivates (reveals all) when advancing past the last lane", () => {
    expect(advanceGuidedStep({ active: true, stepIndex: LAST })).toEqual({
      active: false,
      stepIndex: LAST,
    });
  });

  it("is a no-op when advancing an inactive state", () => {
    const state: GuidedModeState = { active: false, stepIndex: 2 };
    expect(advanceGuidedStep(state)).toBe(state);
  });

  it("skip jumps straight to the full grid", () => {
    expect(skipGuided({ active: true, stepIndex: 1 })).toEqual({
      active: false,
      stepIndex: LAST,
    });
  });

  it("exit leaves guided but keeps the current step index", () => {
    expect(exitGuided({ active: true, stepIndex: 2 })).toEqual({
      active: false,
      stepIndex: 2,
    });
  });

  it("flags the last step for Finish vs Next copy", () => {
    expect(isLastGuidedStep({ active: true, stepIndex: LAST })).toBe(true);
    expect(isLastGuidedStep({ active: true, stepIndex: 0 })).toBe(false);
  });
});

describe("getRevealedLaneIds", () => {
  it("reveals lanes up to and including the current step when active", () => {
    expect(getRevealedLaneIds({ active: true, stepIndex: 0 })).toEqual(
      SEQUENCE.slice(0, 1),
    );
    expect(getRevealedLaneIds({ active: true, stepIndex: 2 })).toEqual(
      SEQUENCE.slice(0, 3),
    );
  });

  it("reveals every lane when inactive", () => {
    expect(getRevealedLaneIds({ active: false, stepIndex: 0 })).toEqual(SEQUENCE);
  });
});

describe("maskPatternToLanes", () => {
  it("zeroes lanes that are not revealed and preserves revealed lanes", () => {
    const pattern = clonePattern(BEAT_STYLES.trap.pattern);
    const masked = maskPatternToLanes(pattern, ["kick", "snare"]);

    expect(masked.kick).toEqual(pattern.kick);
    expect(masked.snare).toEqual(pattern.snare);
    expect(masked.hat.every((step) => step === false)).toBe(true);
    expect(masked["808"].every((step) => step === false)).toBe(true);
    expect(masked.melody.every((step) => step === false)).toBe(true);
  });

  it("does not mutate the input pattern", () => {
    const pattern = clonePattern(BEAT_STYLES.trap.pattern);
    const before = clonePattern(pattern);
    maskPatternToLanes(pattern, ["kick"]);
    expect(pattern).toEqual(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- guidedMode`
Expected: FAIL — `Failed to resolve import "./guidedMode"` / functions undefined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/guidedMode.ts`:

```ts
import { INSTRUMENTS } from "./instruments";
import { clonePattern } from "./patternState";
import type { InstrumentId, Pattern } from "./patterns";

export interface GuidedModeState {
  /** True while the user is being walked through the layers. */
  active: boolean;
  /** Index into the guided sequence of the lane currently being introduced. */
  stepIndex: number;
}

/** The introduce-one-at-a-time order, derived from INSTRUMENTS (single source of truth). */
export function getGuidedSequence(): InstrumentId[] {
  return INSTRUMENTS.map((instrument) => instrument.id);
}

function lastIndex(): number {
  return getGuidedSequence().length - 1;
}

export function startGuidedState(): GuidedModeState {
  return { active: true, stepIndex: 0 };
}

/** Reveal the next lane; advancing past the final lane reveals everything (free grid). */
export function advanceGuidedStep(state: GuidedModeState): GuidedModeState {
  if (!state.active) {
    return state;
  }
  if (state.stepIndex >= lastIndex()) {
    return { active: false, stepIndex: lastIndex() };
  }
  return { active: true, stepIndex: state.stepIndex + 1 };
}

/** Jump straight to the full free-form grid. */
export function skipGuided(_state: GuidedModeState): GuidedModeState {
  return { active: false, stepIndex: lastIndex() };
}

/** Leave guided mode but keep where the user was (used by the Exit button). */
export function exitGuided(state: GuidedModeState): GuidedModeState {
  return { active: false, stepIndex: state.stepIndex };
}

export function isLastGuidedStep(state: GuidedModeState): boolean {
  return state.stepIndex >= lastIndex();
}

/** Lanes the user can see/hear: up to the current step while active, all lanes otherwise. */
export function getRevealedLaneIds(state: GuidedModeState): InstrumentId[] {
  const sequence = getGuidedSequence();
  return state.active ? sequence.slice(0, state.stepIndex + 1) : sequence;
}

/** Non-mutating copy of `pattern` with any lane not in `revealedIds` silenced (all steps off). */
export function maskPatternToLanes(
  pattern: Pattern,
  revealedIds: InstrumentId[],
): Pattern {
  const revealed = new Set(revealedIds);
  const masked = clonePattern(pattern);
  for (const id of getGuidedSequence()) {
    if (!revealed.has(id)) {
      masked[id] = masked[id].map(() => false);
    }
  }
  return masked;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- guidedMode`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guidedMode.ts src/lib/guidedMode.test.ts
git commit -m "feat(pr-29): guided mode sequence, transitions, and pattern mask"
```

---

### Task 2: `guidedModePrefs.ts` — persist guided-vs-free in localStorage

**Files:**
- Create: `src/lib/guidedModePrefs.ts`
- Test: `src/lib/guidedModePrefs.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type GuidedPref = "guided" | "free"`
  - `readGuidedPref(storage?: Storage | null): GuidedPref`
  - `writeGuidedPref(pref: GuidedPref, storage?: Storage | null): void`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guidedModePrefs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readGuidedPref, writeGuidedPref } from "./guidedModePrefs";

function createFakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const throwingStorage = {
  getItem: () => {
    throw new Error("storage blocked");
  },
  setItem: () => {
    throw new Error("storage blocked");
  },
} as unknown as Storage;

describe("readGuidedPref", () => {
  it("defaults a first-time visitor (no stored key) to guided", () => {
    expect(readGuidedPref(createFakeStorage())).toBe("guided");
  });

  it("returns a stored free preference", () => {
    expect(readGuidedPref(createFakeStorage({ "beatlab.guidedMode": "free" }))).toBe(
      "free",
    );
  });

  it("treats an unknown stored value as guided", () => {
    expect(
      readGuidedPref(createFakeStorage({ "beatlab.guidedMode": "garbage" })),
    ).toBe("guided");
  });

  it("falls back to guided when storage throws", () => {
    expect(readGuidedPref(throwingStorage)).toBe("guided");
  });

  it("falls back to guided when storage is null", () => {
    expect(readGuidedPref(null)).toBe("guided");
  });
});

describe("writeGuidedPref", () => {
  it("round-trips through storage", () => {
    const storage = createFakeStorage();
    writeGuidedPref("free", storage);
    expect(readGuidedPref(storage)).toBe("free");
    writeGuidedPref("guided", storage);
    expect(readGuidedPref(storage)).toBe("guided");
  });

  it("swallows storage errors instead of throwing", () => {
    expect(() => writeGuidedPref("free", throwingStorage)).not.toThrow();
    expect(() => writeGuidedPref("free", null)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- guidedModePrefs`
Expected: FAIL — `Failed to resolve import "./guidedModePrefs"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/guidedModePrefs.ts`:

```ts
export type GuidedPref = "guided" | "free";

const STORAGE_KEY = "beatlab.guidedMode";

/** Best-effort access to localStorage; returns null where it is unavailable. */
function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** First-time visitors (no key) and any failure fall back to guided. */
export function readGuidedPref(
  storage: Storage | null = defaultStorage(),
): GuidedPref {
  try {
    return storage?.getItem(STORAGE_KEY) === "free" ? "free" : "guided";
  } catch {
    return "guided";
  }
}

/** Persist the preference; never throws (private mode / disabled storage is fine). */
export function writeGuidedPref(
  pref: GuidedPref,
  storage: Storage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage unavailable — preference is best-effort only.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- guidedModePrefs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guidedModePrefs.ts src/lib/guidedModePrefs.test.ts
git commit -m "feat(pr-29): persist guided-vs-free preference in localStorage"
```

---

### Task 3: `SequencerPanel` renders a filtered lane list

**Files:**
- Modify: `src/components/SequencerPanel.tsx` (lines 1, 8-30, 32-54, 106-107)
- Test: `src/components/SequencerPanel.test.tsx`

**Interfaces:**
- Consumes: `InstrumentOption` from `../lib/instruments`.
- Produces: `SequencerPanelProps.visibleInstruments?: InstrumentOption[]` (defaults to the full `INSTRUMENTS`). Behavior is unchanged when the prop is omitted.

- [ ] **Step 1: Write the failing test**

Add to `src/components/SequencerPanel.test.tsx` (inside the existing top-level `describe` block grouping is fine; place after the existing cases):

```ts
describe("SequencerPanel guided filtering", () => {
  it("renders every lane when visibleInstruments is omitted", () => {
    const html = renderPanel();
    for (const instrument of INSTRUMENTS) {
      expect(html).toContain(`>${instrument.label}</span>`);
    }
  });

  it("renders only the lanes passed in visibleInstruments", () => {
    const visible = INSTRUMENTS.filter((instrument) =>
      ["kick", "snare"].includes(instrument.id),
    );
    const html = renderPanel({ visibleInstruments: visible });

    expect(html).toContain(">Kick</span>");
    expect(html).toContain(">Snare</span>");
    expect(html).not.toContain(">Hat</span>");
    expect(html).not.toContain(">808</span>");
    expect(html).not.toContain(">Melody</span>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SequencerPanel`
Expected: FAIL — the second case still renders all lanes (prop ignored), so `Hat`/`808`/`Melody` are present.

- [ ] **Step 3: Add the prop and iterate it**

In `src/components/SequencerPanel.tsx`:

Change the first import line:

```ts
import { INSTRUMENTS, type InstrumentOption } from "../lib/instruments";
```

Add to `SequencerPanelProps` (after the `activeStep: number | null;` line):

```ts
  /** Lanes to render, in order. Defaults to all instruments (free-form grid). */
  visibleInstruments?: InstrumentOption[];
```

Add the destructured prop with its default (in the function parameter list, after `activeStep,`):

```ts
  visibleInstruments = INSTRUMENTS,
```

Change the lane map source (currently `{INSTRUMENTS.map((instrument) => (`):

```tsx
        {visibleInstruments.map((instrument) => (
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SequencerPanel`
Expected: PASS (both new cases and all existing cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/SequencerPanel.tsx src/components/SequencerPanel.test.tsx
git commit -m "feat(pr-29): SequencerPanel renders a filtered visibleInstruments list"
```

---

### Task 4: `GuidedModeBanner` component + styles

**Files:**
- Create: `src/components/GuidedModeBanner.tsx`
- Create: `src/components/GuidedModeBanner.test.tsx`
- Modify: `src/styles.css` (append a `.guided-banner` block)

**Interfaces:**
- Consumes: `InstrumentOption` from `../lib/instruments`.
- Produces:
  - `interface GuidedModeBannerProps { instrument: InstrumentOption; stepIndex: number; stepCount: number; isLastStep: boolean; onNext: () => void; onSkip: () => void; onExit: () => void; }`
  - `GuidedModeBanner(props: GuidedModeBannerProps): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/components/GuidedModeBanner.test.tsx`:

```ts
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INSTRUMENTS } from "../lib/instruments";
import { GuidedModeBanner } from "./GuidedModeBanner";

function noop() {}

const kick = INSTRUMENTS[0];
const melody = INSTRUMENTS[INSTRUMENTS.length - 1];

describe("GuidedModeBanner", () => {
  it("shows the current step number, label, role, and explainer", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={0}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );

    expect(html).toContain(`Step 1 of ${INSTRUMENTS.length}`);
    expect(html).toContain(kick.label);
    expect(html).toContain(kick.role);
    expect(html).toContain(kick.explainer);
  });

  it("labels the advance button 'Next layer' on a middle step", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={0}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Next layer");
    expect(html).not.toContain("Finish");
  });

  it("labels the advance button 'Finish' on the last step", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={melody}
        stepIndex={INSTRUMENTS.length - 1}
        stepCount={INSTRUMENTS.length}
        isLastStep
        onNext={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Finish");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- GuidedModeBanner`
Expected: FAIL — `Failed to resolve import "./GuidedModeBanner"`.

- [ ] **Step 3: Write the component**

Create `src/components/GuidedModeBanner.tsx`:

```tsx
import type { InstrumentOption } from "../lib/instruments";

export interface GuidedModeBannerProps {
  /** The lane currently being introduced. */
  instrument: InstrumentOption;
  stepIndex: number;
  stepCount: number;
  /** True on the final lane — switches the advance button to "Finish". */
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
}

export function GuidedModeBanner({
  instrument,
  stepIndex,
  stepCount,
  isLastStep,
  onNext,
  onSkip,
  onExit,
}: GuidedModeBannerProps) {
  return (
    <section className="panel guided-banner" aria-label="Guided build">
      <div className="guided-banner__copy">
        <p className="eyebrow">
          Step {stepIndex + 1} of {stepCount} — {instrument.label}
        </p>
        <p className="guided-banner__role">{instrument.role}</p>
        <p className="guided-banner__explainer">{instrument.explainer}</p>
      </div>
      <div className="guided-banner__actions">
        <button className="star-button" type="button" onClick={onNext}>
          {isLastStep ? "Finish" : "Next layer"}
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onSkip}
        >
          Skip to full grid
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onExit}
        >
          Exit
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- GuidedModeBanner`
Expected: PASS.

- [ ] **Step 5: Add styles**

Append to `src/styles.css`:

```css
.guided-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.guided-banner__copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.guided-banner__role {
  font-weight: 600;
}

.guided-banner__explainer {
  opacity: 0.8;
  max-width: 48ch;
}

.guided-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/GuidedModeBanner.tsx src/components/GuidedModeBanner.test.tsx src/styles.css
git commit -m "feat(pr-29): GuidedModeBanner component and styles"
```

---

### Task 5: Wire guided mode into `App`

**Files:**
- Modify: `src/App.tsx` (imports; new state/memos near the other `useState`/`useMemo` at lines ~75-146; `playableStyle` memo at lines 139-142; handlers near the other handlers ~302-319; render the banner + re-entry button and pass `visibleInstruments` into `<SequencerPanel>` at lines ~495-514)

**Interfaces:**
- Consumes: everything produced by Tasks 1, 2, 4 (`GuidedModeState`, `startGuidedState`, `advanceGuidedStep`, `skipGuided`, `exitGuided`, `isLastGuidedStep`, `getRevealedLaneIds`, `getGuidedSequence`, `maskPatternToLanes`, `readGuidedPref`, `writeGuidedPref`, `GuidedModeBanner`); `INSTRUMENTS` from `./lib/instruments`.
- Produces: the integrated guided-mode UX. No exports consumed by other tasks.

> **Note:** `App.tsx` is on the module-hygiene allowlist, so it may exceed 300 lines. There is no unit test for `App` (it is the top-level wiring component in a `node` test env); this task is verified by `npm run check` plus the manual smoke check in Step 5.

- [ ] **Step 1: Add imports**

In `src/App.tsx`, add to the existing import block:

```ts
import { GuidedModeBanner } from "./components/GuidedModeBanner";
import { INSTRUMENTS } from "./lib/instruments";
import {
  advanceGuidedStep,
  exitGuided,
  getGuidedSequence,
  getRevealedLaneIds,
  isLastGuidedStep,
  maskPatternToLanes,
  skipGuided,
  startGuidedState,
  type GuidedModeState,
} from "./lib/guidedMode";
import { readGuidedPref, writeGuidedPref } from "./lib/guidedModePrefs";
```

- [ ] **Step 2: Add state + derived values**

After the `const [activeStep, setActiveStep] = useState<number | null>(null);` line, add:

```ts
  const [guidedState, setGuidedState] = useState<GuidedModeState>(() =>
    readGuidedPref() === "guided"
      ? startGuidedState()
      : { active: false, stepIndex: getGuidedSequence().length - 1 },
  );
```

After the existing `bassPalette` memo (around line 146), add:

```ts
  const revealedLaneIds = useMemo(
    () => getRevealedLaneIds(guidedState),
    [guidedState],
  );
  const visibleInstruments = useMemo(
    () => INSTRUMENTS.filter((instrument) => revealedLaneIds.includes(instrument.id)),
    [revealedLaneIds],
  );
  const guidedInstrument = INSTRUMENTS[guidedState.stepIndex] ?? INSTRUMENTS[0];
```

- [ ] **Step 3: Mask the audible pattern while guided**

Replace the existing `playableStyle` memo:

```ts
  const playableStyle = useMemo(
    () => createPlayableStyle(sequencer),
    [sequencer],
  );
```

with:

```ts
  const playableStyle = useMemo(
    () =>
      createPlayableStyle(
        guidedState.active
          ? { ...sequencer, pattern: maskPatternToLanes(sequencer.pattern, revealedLaneIds) }
          : sequencer,
      ),
    [sequencer, guidedState.active, revealedLaneIds],
  );
```

- [ ] **Step 4: Add handlers**

After the existing `updateMelodyStepPitch` handler (around line 326), add:

```ts
  function changeGuidedState(next: GuidedModeState) {
    setGuidedState(next);
    writeGuidedPref(next.active ? "guided" : "free");
    if (isPlaying && engineRef.current) {
      const pattern = next.active
        ? maskPatternToLanes(sequencer.pattern, getRevealedLaneIds(next))
        : sequencer.pattern;
      engineRef.current.start(createPlayableStyle({ ...sequencer, pattern }));
    }
  }

  function handleGuidedNext() {
    changeGuidedState(advanceGuidedStep(guidedState));
  }

  function handleGuidedSkip() {
    changeGuidedState(skipGuided(guidedState));
  }

  function handleGuidedExit() {
    changeGuidedState(exitGuided(guidedState));
  }

  function handleGuidedStart() {
    changeGuidedState(startGuidedState());
  }
```

- [ ] **Step 5: Render the banner + re-entry, and pass `visibleInstruments`**

In the JSX, immediately before `<SequencerPanel` (around line 495), add:

```tsx
        {guidedState.active ? (
          <GuidedModeBanner
            instrument={guidedInstrument}
            stepIndex={guidedState.stepIndex}
            stepCount={getGuidedSequence().length}
            isLastStep={isLastGuidedStep(guidedState)}
            onNext={handleGuidedNext}
            onSkip={handleGuidedSkip}
            onExit={handleGuidedExit}
          />
        ) : (
          <div className="guided-reentry">
            <button
              className="button secondary compact"
              type="button"
              onClick={handleGuidedStart}
            >
              ▸ Start guided build
            </button>
          </div>
        )}
```

Then add the `visibleInstruments` prop to `<SequencerPanel` (alongside `pattern={sequencer.pattern}`):

```tsx
          visibleInstruments={visibleInstruments}
```

- [ ] **Step 6: Run the full gate + manual smoke check**

Run: `npm run check`
Expected: PASS (hygiene + scripts typecheck + full vitest, including the new suites).

Manual smoke check (`npm run dev`, open the app):
- First load (clear `localStorage`): only the Kick lane shows; banner reads "Step 1 of 7 — Kick"; pressing play loops kick only.
- "Next layer" reveals Snare; play now includes kick+snare; continue to the last lane.
- "Finish" / "Skip to full grid" / "Exit" all drop to the full 7-lane grid; reload keeps you in free mode.
- "▸ Start guided build" re-enters guided mode at Step 1.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(pr-29): wire guided layering mode into App"
```

---

## Self-Review

**Spec coverage:**
- First-time/opted-in walkthrough with role explanations → Tasks 2 (default), 4 (banner copy), 5 (wiring). ✓
- Exit anytime / re-enter → Task 1 (`skipGuided`/`exitGuided`/`startGuidedState`), Task 5 (buttons + re-entry). ✓
- Free-form unchanged when off → Task 3 (default-full prop), Task 5 (mask only when `active`). ✓
- Sequence defined in data → Task 1 (`getGuidedSequence` from `INSTRUMENTS`). ✓
- Persistence → Task 2; default guided for first-timers. ✓
- Hidden lanes silent → Task 1 (`maskPatternToLanes`), Task 5 (applied to `playableStyle` + live restart). ✓
- Deterministic tests → all suites pure; no `Math.random`/`Date.now`. ✓

**Type consistency:** `GuidedModeState`, `getGuidedSequence`, `getRevealedLaneIds`, `maskPatternToLanes`, `isLastGuidedStep`, `startGuidedState`, `advanceGuidedStep`, `skipGuided`, `exitGuided`, `readGuidedPref`, `writeGuidedPref`, `GuidedModeBannerProps`, and `visibleInstruments` are referenced with identical names/signatures across Tasks 1–5. ✓

**Placeholder scan:** none — every code step contains complete code. ✓
