# Beginner Experience — Wave 1 (Visual Feedback) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the playing loop legible to a beginner with three visual layers — a moving playhead, per-lane role coaching, and a live EQ/spectrum meter.

**Architecture:** The audio engine gains two **pull** methods — `getActiveStep()` and `getFrequencyData(buf)` — that the React layer samples via `requestAnimationFrame`. The only nontrivial logic (which step is "active" given a look-ahead schedule, and raw-bins → bar-heights) lives in pure, unit-tested helpers. Role coaching is pure data on the instrument list. No change to the pattern/URL data model.

**Tech Stack:** Vite + React 19 + TypeScript, native Web Audio API, Tone.js (secondary engine), Vitest (node env, components tested via `react-dom/server` `renderToStaticMarkup`).

## Global Constraints

- Tests run in the **`node`** Vitest environment — no jsdom, no DOM, no real `requestAnimationFrame`. Components are tested with `renderToStaticMarkup` from `react-dom/server`. Never write a test that needs a browser, real timers, or real audio.
- The `AudioEngine` interface (`src/audio/audioEngine.ts`) is implemented by **three** engines that all pass the shared `runAudioEngineContract` suite: web-audio (`webAudioBeatEngine.ts`), tone-sample (`toneSampleBeatEngine.ts`), and the fake (`fakeAudioEngine.ts`). Any new interface method MUST be implemented in all three and the contract suite extended.
- Module hygiene: `npm run hygiene` enforces a file-size limit. Keep new files small and focused; prefer extracting helpers over growing a component.
- 16 steps per loop (`STEPS_PER_LOOP = 16`). Step indices are `0..15`.
- Respect `prefers-reduced-motion`: no pad-pulse animation and no high-rate canvas animation when it is set; the playhead column must still be marked statically.
- Verify each task with `npm test` before committing. Full gate before the final commit: `npm run check`.

---

## File Structure

- `src/lib/instruments.ts` — **modify**: add `role` + `explainer` per lane (Task 1).
- `src/components/SequencerPanel.tsx` — **modify**: render role copy (Task 1); accept `activeStep` and render playhead/pulse (Task 4).
- `src/components/SequencerPanel.test.tsx` — **create**: static-markup tests (Tasks 1, 4).
- `src/audio/transport.ts` — **modify**: add `StepQueueEntry` type + pure `getActiveStep(queue, currentTime)` (Task 2).
- `src/audio/transport.test.ts` — **modify**: tests for `getActiveStep` (Task 2).
- `src/audio/audioEngine.ts` — **modify**: extend `AudioEngine` interface with `getActiveStep` + `getFrequencyData` (Tasks 3, 6).
- `src/audio/webAudioBeatEngine.ts` — **modify**: maintain step queue + analyser tap (Tasks 3, 6).
- `src/audio/webAudioBeatEngine.test.ts` — **modify**: precise positive assertions (Tasks 3, 6).
- `src/audio/toneSampleBeatEngine.ts` — **modify**: track visual step; `getFrequencyData` returns `false` (Tasks 3, 6).
- `src/audio/fakeAudioEngine.ts` — **modify**: settable active step; `getFrequencyData` returns `false` (Tasks 3, 6).
- `src/audio/engineContract.ts` — **modify**: shared contract assertions for the new methods (Tasks 3, 6).
- `src/audio/engineContract.test.ts` — **modify**: add `createAnalyser` to the web-audio fake context (Task 6).
- `src/lib/eqBars.ts` — **create**: pure `mapFrequencyBars(data, barCount)` (Task 5).
- `src/lib/eqBars.test.ts` — **create**: tests for `mapFrequencyBars` (Task 5).
- `src/components/EqVisualizer.tsx` — **create**: canvas + rAF glue (Task 7).
- `src/components/EqVisualizer.test.tsx` — **create**: static-markup test (Task 7).
- `src/App.tsx` — **modify**: rAF poll of `getActiveStep`; pass `activeStep`; render `<EqVisualizer>` (Tasks 4, 7).
- `src/styles.css` — **modify**: playhead/pulse, role hint, EQ canvas styles + reduced-motion (Tasks 1, 4, 7).

---

## Task 1: Instrument role coaching (PR-23)

Pure data + label render. Independent of the engine; lands first.

**Files:**
- Modify: `src/lib/instruments.ts`
- Modify: `src/components/SequencerPanel.tsx`
- Create: `src/components/SequencerPanel.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `InstrumentOption` now has `role: string` and `explainer: string`. `INSTRUMENTS` unchanged in length/order (`kick`, `snare`, `hat`, `openHat`).

- [ ] **Step 1: Write the failing test for instrument metadata**

Create `src/components/SequencerPanel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { INSTRUMENTS } from "../lib/instruments";
import { SequencerPanel } from "./SequencerPanel";

function noop() {}

function renderPanel(extra: Partial<Parameters<typeof SequencerPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <SequencerPanel
      styleName="Trap"
      activeSteps={4}
      bpm={140}
      swingPercent={0}
      audioEngineKind="web-audio"
      pattern={BEAT_STYLES.trap.pattern}
      activeStep={null}
      onBpmChange={noop}
      onSwingChange={noop}
      onAudioEngineKindChange={noop}
      onReset={noop}
      onToggleStep={noop}
      {...extra}
    />,
  );
}

describe("INSTRUMENTS metadata", () => {
  it("gives every lane a non-empty role and explainer", () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.role.trim().length).toBeGreaterThan(0);
      expect(instrument.explainer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("SequencerPanel role coaching", () => {
  it("renders each lane's role explainer text", () => {
    const html = renderPanel();
    for (const instrument of INSTRUMENTS) {
      expect(html).toContain(instrument.explainer);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/SequencerPanel.test.tsx`
Expected: FAIL — `instrument.role` is undefined and `SequencerPanel` does not accept `activeStep`/does not render explainers (TypeScript/assertion errors).

- [ ] **Step 3: Add role + explainer to instrument metadata**

Replace the body of `src/lib/instruments.ts` with:

```ts
import type { InstrumentId } from "./patterns";

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
  /** Short role tag, e.g. "Pulse". */
  role: string;
  /** One-line, beginner-first explanation of what the sound does. */
  explainer: string;
}

export const INSTRUMENTS: InstrumentOption[] = [
  {
    id: "kick",
    label: "Kick",
    role: "Pulse",
    explainer: "The heartbeat — low boom that lands on the main beats.",
  },
  {
    id: "snare",
    label: "Snare",
    role: "Backbeat",
    explainer: "The clap/crack that answers the kick, usually on beats 2 and 4.",
  },
  {
    id: "hat",
    label: "Hat",
    role: "Subdivision",
    explainer: "The fast ticks that keep time between the kick and snare.",
  },
  {
    id: "openHat",
    label: "Open",
    role: "Accent",
    explainer: "A longer, sizzling hat that adds lift and movement.",
  },
];
```

- [ ] **Step 4: Render the role copy in SequencerPanel**

In `src/components/SequencerPanel.tsx`, replace the `track-label` div inside the `INSTRUMENTS.map(...)` with a labelled block that shows the role and explainer:

```tsx
            <div className="track-label">
              <span className="track-label__name">{instrument.label}</span>
              <span className="track-label__role">{instrument.role}</span>
              <span className="track-label__explainer">{instrument.explainer}</span>
            </div>
```

- [ ] **Step 5: Add styles for the role hint**

Append to `src/styles.css`:

```css
.track-label {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.track-label__role {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.track-label__explainer {
  font-size: 0.7rem;
  opacity: 0.6;
  max-width: 16ch;
  line-height: 1.2;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/components/SequencerPanel.test.tsx`
Expected: PASS (the metadata + role-coaching describe blocks; the `activeStep` prop is already accepted by the test wrapper — Task 4 implements the rest).

Note: `SequencerPanel` must accept an `activeStep` prop for this file to type-check. Add it now as an unused optional-to-required prop:

In `src/components/SequencerPanel.tsx`, add to `SequencerPanelProps`:

```tsx
  activeStep: number | null;
```

and add `activeStep,` to the destructured params. It is consumed in Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/lib/instruments.ts src/components/SequencerPanel.tsx src/components/SequencerPanel.test.tsx src/styles.css
git commit -m "feat(PR-23): instrument role coaching on sequencer lanes"
```

---

## Task 2: Pure `getActiveStep` helper (PR-22)

The look-ahead scheduler queues steps with future audio times. This helper answers "which step should be lit right now" from the queue and the audio clock — no audio, no timers.

**Files:**
- Modify: `src/audio/transport.ts`
- Modify: `src/audio/transport.test.ts`

**Interfaces:**
- Produces: `interface StepQueueEntry { stepIndex: number; time: number }` and `getActiveStep(queue: readonly StepQueueEntry[], currentTime: number): number | null`.

- [ ] **Step 1: Write the failing test**

Append to `src/audio/transport.test.ts`:

```ts
import { getActiveStep, type StepQueueEntry } from "./transport";

describe("getActiveStep", () => {
  const queue: StepQueueEntry[] = [
    { stepIndex: 0, time: 0.08 },
    { stepIndex: 1, time: 0.19 },
    { stepIndex: 2, time: 0.30 },
  ];

  it("returns null when nothing has sounded yet", () => {
    expect(getActiveStep(queue, 0.0)).toBeNull();
  });

  it("returns the latest step whose time has passed", () => {
    expect(getActiveStep(queue, 0.08)).toBe(0);
    expect(getActiveStep(queue, 0.2)).toBe(1);
    expect(getActiveStep(queue, 5.0)).toBe(2);
  });

  it("returns null for an empty queue", () => {
    expect(getActiveStep([], 1.0)).toBeNull();
  });
});
```

(`describe`/`expect`/`it` are already imported at the top of the file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/audio/transport.test.ts`
Expected: FAIL — `getActiveStep`/`StepQueueEntry` are not exported.

- [ ] **Step 3: Implement the helper**

Append to `src/audio/transport.ts`:

```ts
export interface StepQueueEntry {
  stepIndex: number;
  time: number;
}

/**
 * Given steps scheduled with future audio times and the current audio clock,
 * return the step that should currently be highlighted — the most recently
 * scheduled entry whose `time` has been reached — or `null` if none has.
 */
export function getActiveStep(
  queue: readonly StepQueueEntry[],
  currentTime: number,
): number | null {
  let active: number | null = null;
  let bestTime = -Infinity;
  for (const entry of queue) {
    if (entry.time <= currentTime && entry.time >= bestTime) {
      bestTime = entry.time;
      active = entry.stepIndex;
    }
  }
  return active;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/audio/transport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/transport.ts src/audio/transport.test.ts
git commit -m "feat(PR-22): pure getActiveStep playhead helper"
```

---

## Task 3: Engine `getActiveStep()` seam (PR-22)

Add `getActiveStep` to the engine interface and implement it in all three engines plus the shared contract.

**Files:**
- Modify: `src/audio/audioEngine.ts`
- Modify: `src/audio/webAudioBeatEngine.ts`
- Modify: `src/audio/toneSampleBeatEngine.ts`
- Modify: `src/audio/fakeAudioEngine.ts`
- Modify: `src/audio/engineContract.ts`
- Modify: `src/audio/webAudioBeatEngine.test.ts`

**Interfaces:**
- Consumes: `getActiveStep`, `StepQueueEntry` from Task 2.
- Produces: `AudioEngine.getActiveStep(): number | null`. `FakeAudioEngine.setActiveStepForTest(step: number | null): void`.

- [ ] **Step 1: Add the contract assertion (failing)**

In `src/audio/engineContract.ts`, inside `runAudioEngineContract`'s `describe`, add:

```ts
    it("reports no active step before playback and after stop", () => {
      const { engine } = makeHarness();

      expect(engine.getActiveStep()).toBeNull();

      engine.start(BEAT_STYLES.trap);
      engine.stop();

      expect(engine.getActiveStep()).toBeNull();
    });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/audio/engineContract.test.ts`
Expected: FAIL — `engine.getActiveStep` is not a function on any engine.

- [ ] **Step 3: Extend the interface**

In `src/audio/audioEngine.ts`, add to the `AudioEngine` interface (after `playProducerTag`):

```ts
  /** The step index that should currently be highlighted, or null when idle. */
  getActiveStep(): number | null;
```

- [ ] **Step 4: Implement in the Web Audio engine**

In `src/audio/webAudioBeatEngine.ts`:

Add the import:

```ts
import {
  getActiveStep,
  getNextStepIndex,
  getStepEvents,
  getSwingStepDurationSeconds,
  SCHEDULE_AHEAD_SECONDS,
  SCHEDULER_TICK_MS,
  START_DELAY_SECONDS,
  type StepQueueEntry,
} from "./transport";
```

Add queue state next to `let step = 0;`:

```ts
  let stepQueue: StepQueueEntry[] = [];
```

In `start()`, reset the queue (add after `step = 0;`):

```ts
    stepQueue = [];
```

In `start()`'s `while` loop, record each scheduled step right after `scheduleStep(...)`:

```ts
        scheduleStep(style, step, nextStepTime);
        stepQueue.push({ stepIndex: step, time: nextStepTime });
        if (stepQueue.length > 64) {
          stepQueue = stepQueue.slice(-32);
        }
```

In `stop()`, clear the queue (add at the end of the function body):

```ts
    stepQueue = [];
```

Add the method and include it in the returned object:

```ts
  function getActiveStepIndex(): number | null {
    return getActiveStep(stepQueue, context.currentTime);
  }
```

Update the return statement:

```ts
  return {
    kind: "web-audio",
    ready,
    start,
    stop,
    dispose,
    playProducerTag,
    getActiveStep: getActiveStepIndex,
  };
```

- [ ] **Step 5: Implement in the Tone engine**

In `src/audio/toneSampleBeatEngine.ts`, add state next to `let stepIndex = 0;`:

```ts
  let visualStep: number | null = null;
```

In the `scheduleRepeat` callback, set it as each step plays:

```ts
    eventId = transport.scheduleRepeat((time) => {
      scheduleStep(style, stepIndex, time);
      visualStep = stepIndex;
      stepIndex = (stepIndex + 1) % 16;
    }, "16n");
```

In `stop()`, reset it (add after `transport.stop();`):

```ts
    visualStep = null;
```

Add to the returned object:

```ts
    getActiveStep: () => visualStep,
```

- [ ] **Step 6: Implement in the fake engine**

In `src/audio/fakeAudioEngine.ts`, add to the `FakeAudioEngine` interface:

```ts
  /** Test hook: set the value returned by getActiveStep(). */
  setActiveStepForTest(step: number | null): void;
```

Add state inside `createFakeAudioEngine` (next to `let readyCount = 0;`):

```ts
  let activeStep: number | null = null;
```

In `stop()` and `dispose()`, add `activeStep = null;`. Add to the returned object:

```ts
    getActiveStep() {
      return activeStep;
    },
    setActiveStepForTest(step: number | null) {
      activeStep = step;
    },
```

- [ ] **Step 7: Add a precise Web Audio assertion**

In `src/audio/webAudioBeatEngine.test.ts`, add inside the existing `describe`:

```ts
  it("reports the active step from the scheduled queue and clears on stop", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    expect(engine.getActiveStep()).toBeNull();

    engine.start(BEAT_STYLES.trap);
    runtime.runTimer(1);

    // The first step is scheduled at START_DELAY_SECONDS (0.08). Advance the
    // mocked audio clock past it and the active step is 0.
    runtime.contexts[0].currentTime = 0.08;
    expect(engine.getActiveStep()).toBe(0);

    engine.stop();
    expect(engine.getActiveStep()).toBeNull();
  });
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- src/audio`
Expected: PASS for `engineContract.test.ts`, `webAudioBeatEngine.test.ts`, `toneSampleBeatEngine.test.ts`, `fakeAudioEngine.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/audio/audioEngine.ts src/audio/webAudioBeatEngine.ts src/audio/toneSampleBeatEngine.ts src/audio/fakeAudioEngine.ts src/audio/engineContract.ts src/audio/webAudioBeatEngine.test.ts
git commit -m "feat(PR-22): expose getActiveStep on the audio engine contract"
```

---

## Task 4: App rAF poll + SequencerPanel playhead (PR-22)

Wire the engine's active step into a moving playhead and pad pulse.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SequencerPanel.tsx`
- Modify: `src/components/SequencerPanel.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `engine.getActiveStep()` (Task 3); `SequencerPanel` `activeStep` prop (Task 1).

- [ ] **Step 1: Write the failing test for the playhead render**

Add to `src/components/SequencerPanel.test.tsx`:

```tsx
describe("SequencerPanel playhead", () => {
  it("marks the active step column", () => {
    const html = renderPanel({ activeStep: 0 });
    expect(html).toContain("playhead");
  });

  it("renders no playhead when activeStep is null", () => {
    const html = renderPanel({ activeStep: null });
    expect(html).not.toContain("playhead");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/SequencerPanel.test.tsx`
Expected: FAIL — no `playhead` class is rendered.

- [ ] **Step 3: Render the playhead + pulse in SequencerPanel**

In `src/components/SequencerPanel.tsx`, replace the `step-cell` button `className` expression with one that adds `playhead` on the active column and `firing` when an active pad sounds:

```tsx
              <button
                className={[
                  "step-cell",
                  step ? "on" : "",
                  index % 4 === 0 ? "downbeat" : "",
                  index === activeStep ? "playhead" : "",
                  step && index === activeStep ? "firing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${instrument.id}-${index}`}
                type="button"
                aria-pressed={step}
                aria-label={`${instrument.label} step ${index + 1} ${
                  step ? "on" : "off"
                }`}
                onClick={() => onToggleStep(instrument.id, index)}
              />
```

- [ ] **Step 4: Add playhead + pulse styles (with reduced-motion)**

Append to `src/styles.css`:

```css
.step-cell.playhead {
  box-shadow: inset 0 0 0 2px var(--accent, #ffd23f);
}

.step-cell.firing {
  animation: step-pulse 180ms ease-out;
}

@keyframes step-pulse {
  from { transform: scale(1.25); filter: brightness(1.6); }
  to { transform: scale(1); filter: brightness(1); }
}

@media (prefers-reduced-motion: reduce) {
  .step-cell.firing {
    animation: none;
  }
}
```

(If `--accent` is not defined in `:root`, the `var(...)` fallback `#ffd23f` is used.)

- [ ] **Step 5: Poll the active step in App**

In `src/App.tsx`, add `useEffect`/`useState` wiring. Add state near the other `useState` calls:

```tsx
  const [activeStep, setActiveStep] = useState<number | null>(null);
```

Add an effect that polls while playing (place after the existing effects):

```tsx
  useEffect(() => {
    if (!isPlaying) {
      setActiveStep(null);
      return;
    }

    let frame = 0;
    let last: number | null = null;
    const tick = () => {
      const next = engineRef.current?.getActiveStep() ?? null;
      if (next !== last) {
        last = next;
        setActiveStep(next);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);
```

Pass it to the panel — add `activeStep={activeStep}` to the `<SequencerPanel ... />` props.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/components/SequencerPanel.test.tsx`
Expected: PASS (all SequencerPanel describe blocks).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/SequencerPanel.tsx src/components/SequencerPanel.test.tsx src/styles.css
git commit -m "feat(PR-22): moving playhead and pad pulse during playback"
```

---

## Task 5: Pure `mapFrequencyBars` helper (PR-24)

Raw analyser bins are linear and bottom-heavy. This helper maps them to a fixed number of display bars with a log-ish grouping so high frequencies stay visible.

**Files:**
- Create: `src/lib/eqBars.ts`
- Create: `src/lib/eqBars.test.ts`

**Interfaces:**
- Produces: `mapFrequencyBars(data: Uint8Array, barCount: number): number[]` — returns `barCount` values in `0..1`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/eqBars.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapFrequencyBars } from "./eqBars";

describe("mapFrequencyBars", () => {
  it("returns the requested number of bars", () => {
    const data = new Uint8Array(128).fill(0);
    expect(mapFrequencyBars(data, 16)).toHaveLength(16);
  });

  it("normalizes byte magnitudes to 0..1", () => {
    const data = new Uint8Array(128).fill(255);
    const bars = mapFrequencyBars(data, 8);
    for (const value of bars) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...bars)).toBeCloseTo(1, 5);
  });

  it("returns all zeros for silence", () => {
    const data = new Uint8Array(128).fill(0);
    expect(mapFrequencyBars(data, 8).every((v) => v === 0)).toBe(true);
  });

  it("reflects low-frequency energy in the first bar", () => {
    const data = new Uint8Array(128).fill(0);
    data[0] = 255;
    data[1] = 255;
    const bars = mapFrequencyBars(data, 8);
    expect(bars[0]).toBeGreaterThan(0);
    expect(bars[7]).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/eqBars.test.ts`
Expected: FAIL — `mapFrequencyBars` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/lib/eqBars.ts`:

```ts
/**
 * Map raw analyser frequency bytes to `barCount` display bars in 0..1.
 *
 * Bins are grouped on a roughly logarithmic scale (exponential bin edges) so
 * that the bass-heavy low bins do not swamp the display and high-frequency
 * content stays visible. Each bar is the average of its bin group, divided by
 * 255 to normalize.
 */
export function mapFrequencyBars(data: Uint8Array, barCount: number): number[] {
  if (barCount <= 0 || data.length === 0) {
    return new Array(Math.max(0, barCount)).fill(0);
  }

  const bars: number[] = [];
  for (let bar = 0; bar < barCount; bar += 1) {
    const start = binEdge(bar, barCount, data.length);
    const end = binEdge(bar + 1, barCount, data.length);
    const lo = Math.min(start, data.length - 1);
    const hi = Math.max(lo + 1, end);

    let sum = 0;
    let count = 0;
    for (let i = lo; i < hi && i < data.length; i += 1) {
      sum += data[i];
      count += 1;
    }
    bars.push(count === 0 ? 0 : sum / count / 255);
  }
  return bars;
}

function binEdge(bar: number, barCount: number, binCount: number): number {
  // Exponential edges from bin 0 to the last bin → log-ish frequency spread.
  const fraction = bar / barCount;
  return Math.floor((Math.pow(binCount + 1, fraction) - 1));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/eqBars.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/eqBars.ts src/lib/eqBars.test.ts
git commit -m "feat(PR-24): pure mapFrequencyBars EQ helper"
```

---

## Task 6: Engine `getFrequencyData()` seam (PR-24)

Add a spectrum tap to the engine interface. Web Audio gets a real `AnalyserNode`; Tone and fake return `false` (no analyser wired in Wave 1) so the visualizer shows an idle baseline.

**Files:**
- Modify: `src/audio/audioEngine.ts`
- Modify: `src/audio/webAudioBeatEngine.ts`
- Modify: `src/audio/toneSampleBeatEngine.ts`
- Modify: `src/audio/fakeAudioEngine.ts`
- Modify: `src/audio/engineContract.ts`
- Modify: `src/audio/engineContract.test.ts`

**Interfaces:**
- Produces: `AudioEngine.getFrequencyData(target: Uint8Array): boolean` — `true` when filled, `false` when no analyser is available.

- [ ] **Step 1: Add the contract assertion (failing)**

In `src/audio/engineContract.ts`, add inside the `describe`:

```ts
    it("exposes frequency data without throwing", () => {
      const { engine } = makeHarness();
      const filled = engine.getFrequencyData(new Uint8Array(32));
      expect(typeof filled).toBe("boolean");
    });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/audio/engineContract.test.ts`
Expected: FAIL — `engine.getFrequencyData` is not a function.

- [ ] **Step 3: Extend the interface**

In `src/audio/audioEngine.ts`, add to the `AudioEngine` interface:

```ts
  /**
   * Fill `target` with the current frequency spectrum (0..255 per bin).
   * Returns false when no analyser is available (idle/unsupported engine).
   */
  getFrequencyData(target: Uint8Array): boolean;
```

- [ ] **Step 4: Implement in the Web Audio engine**

In `src/audio/webAudioBeatEngine.ts`, route master through an analyser. Replace:

```ts
  const master = context.createGain();
  master.gain.value = 0.65;
  master.connect(context.destination);
```

with:

```ts
  const master = context.createGain();
  master.gain.value = 0.65;
  const analyser = context.createAnalyser?.() ?? null;
  if (analyser) {
    analyser.fftSize = 256;
    master.connect(analyser);
    analyser.connect(context.destination);
  } else {
    master.connect(context.destination);
  }
```

Add the method:

```ts
  function getFrequencyData(target: Uint8Array): boolean {
    if (!analyser) {
      return false;
    }
    analyser.getByteFrequencyData(target);
    return true;
  }
```

Add `getFrequencyData,` to the returned object.

- [ ] **Step 5: Implement in the Tone and fake engines**

In `src/audio/toneSampleBeatEngine.ts`, add to the returned object:

```ts
    getFrequencyData: () => false,
```

In `src/audio/fakeAudioEngine.ts`, add to the returned object:

```ts
    getFrequencyData() {
      return false;
    },
```

- [ ] **Step 6: Teach the web-audio fake context to create an analyser**

In `src/audio/engineContract.test.ts`, add a `createAnalyser` method to `WebAudioFakeContext` (so the real engine's analyser branch is exercised):

```ts
  createAnalyser() {
    return new WebAudioFakeAnalyser();
  }
```

And add the class near the other fake node classes:

```ts
class WebAudioFakeAnalyser extends WebAudioFakeNode {
  fftSize = 2048;
  frequencyBinCount = 128;
  getByteFrequencyData(_array: Uint8Array) {
    return undefined;
  }
}
```

Do the same (`createAnalyser` + `WebAudioFakeAnalyser`-style class) in `src/audio/webAudioBeatEngine.test.ts`'s `FakeAudioContext`, so its existing lifecycle tests keep passing with the new master→analyser routing:

```ts
  createAnalyser() {
    return new FakeAnalyserNode();
  }
```

```ts
class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 2048;
  frequencyBinCount = 128;
  getByteFrequencyData(_array: Uint8Array) {
    return undefined;
  }
}
```

- [ ] **Step 7: Run the audio tests to verify they pass**

Run: `npm test -- src/audio`
Expected: PASS across all engine and contract tests.

- [ ] **Step 8: Commit**

```bash
git add src/audio/audioEngine.ts src/audio/webAudioBeatEngine.ts src/audio/toneSampleBeatEngine.ts src/audio/fakeAudioEngine.ts src/audio/engineContract.ts src/audio/engineContract.test.ts src/audio/webAudioBeatEngine.test.ts
git commit -m "feat(PR-24): expose getFrequencyData spectrum tap on the engine"
```

---

## Task 7: EqVisualizer component + wire into App (PR-24)

Canvas + rAF glue that pulls `getFrequencyData` into a reused buffer and draws bars via `mapFrequencyBars`.

**Files:**
- Create: `src/components/EqVisualizer.tsx`
- Create: `src/components/EqVisualizer.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `mapFrequencyBars` (Task 5); `BeatEngine.getFrequencyData` (Task 6).
- Produces: `<EqVisualizer engine={BeatEngine | null} isPlaying={boolean} />`.

- [ ] **Step 1: Write the failing static-markup test**

Create `src/components/EqVisualizer.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EqVisualizer } from "./EqVisualizer";

describe("EqVisualizer", () => {
  it("renders a labelled canvas", () => {
    const html = renderToStaticMarkup(
      <EqVisualizer engine={null} isPlaying={false} />,
    );
    expect(html).toContain("<canvas");
    expect(html.toLowerCase()).toContain("equalizer");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/EqVisualizer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/EqVisualizer.tsx`:

```tsx
import { useEffect, useRef } from "react";
import type { BeatEngine } from "../audio/beatEngine";
import { mapFrequencyBars } from "../lib/eqBars";

const BAR_COUNT = 24;

export interface EqVisualizerProps {
  engine: BeatEngine | null;
  isPlaying: boolean;
}

export function EqVisualizer({ engine, isPlaying }: EqVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const data = new Uint8Array(128);
    let frame = 0;

    const draw = () => {
      const ok = isPlaying && engine ? engine.getFrequencyData(data) : false;
      const bars = ok ? mapFrequencyBars(data, BAR_COUNT) : new Array(BAR_COUNT).fill(0);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const barWidth = width / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const barHeight = Math.max(1, bars[i] * height);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [engine, isPlaying]);

  return (
    <div className="eq-visualizer">
      <span className="eyebrow">Equalizer</span>
      <canvas
        ref={canvasRef}
        width={320}
        height={80}
        role="img"
        aria-label="Live equalizer spectrum"
      />
    </div>
  );
}
```

- [ ] **Step 4: Add EQ styles**

Append to `src/styles.css`:

```css
.eq-visualizer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.eq-visualizer canvas {
  width: 100%;
  height: 80px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}
```

- [ ] **Step 5: Wire it into App**

In `src/App.tsx`, import it:

```tsx
import { EqVisualizer } from "./components/EqVisualizer";
```

Render it inside the workbench, right after `<StyleFidelityMeter ... />`:

```tsx
        <EqVisualizer engine={engineRef.current} isPlaying={isPlaying} />
```

- [ ] **Step 6: Run the component test to verify it passes**

Run: `npm test -- src/components/EqVisualizer.test.tsx`
Expected: PASS

- [ ] **Step 7: Full verification gate**

Run: `npm run check`
Expected: PASS — hygiene (file sizes), script typecheck, and the full test suite all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/EqVisualizer.tsx src/components/EqVisualizer.test.tsx src/App.tsx src/styles.css
git commit -m "feat(PR-24): live EQ spectrum visualizer"
```

---

## Self-Review

**Spec coverage:**
- PR-22 playhead: Task 2 (pure helper), Task 3 (engine seam, all 3 engines + contract), Task 4 (App poll + panel render + reduced-motion). ✓
- PR-23 role coaching: Task 1 (data + render + styles). ✓
- PR-24 EQ visualizer: Task 5 (pure bar mapping), Task 6 (analyser seam, all 3 engines + contract), Task 7 (canvas component + wiring). ✓
- Reduced-motion: Task 4 Step 4 (pad pulse) and the EQ is low-cost; no high-rate React state on the 60fps path. ✓
- Graceful degradation: `getFrequencyData` → false for Tone/fake and when no analyser; `getActiveStep` → null when idle. ✓
- All engines pass the shared contract: Tasks 3 & 6 implement the new methods in web-audio, tone, and fake, and extend `runAudioEngineContract`. ✓
- Node test env / `renderToStaticMarkup`: every component test uses static markup; canvas/rAF glue is untested by design, logic lives in tested pure helpers. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `getActiveStep(): number | null` and `getFrequencyData(target: Uint8Array): boolean` are used identically across the interface, all three engines, both contract assertions, the App poll, and the EQ component. `StepQueueEntry`/`getActiveStep` from Task 2 are consumed by Task 3. `mapFrequencyBars(data, barCount)` from Task 5 is consumed by Task 7. `InstrumentOption.role/explainer` from Task 1 is consumed by the SequencerPanel render. ✓

**Note on test ordering:** Task 1 introduces the `activeStep` prop on `SequencerPanel` (required so its test file type-checks); Task 4 gives it behavior. This is intentional and called out in Task 1 Step 6.
