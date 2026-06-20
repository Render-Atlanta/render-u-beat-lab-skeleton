# AI Beat Commands — Deterministic Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working, offline, fully-tested natural-language command bar that steers the sequencer (switch style, tempo, swing) via a deterministic keyword fast-path — the foundation the Gemini intent-parser plugs into later.

**Architecture:** A pure `CommandAction` union is the contract. `parseFastPath` turns text into an action with no network. `applyAction` dispatches each action to existing sequencer-domain functions, returning a new `SequencerState`. `App.tsx` runs commands through the existing `applySequencerState` path, so commands inherit clamping, history, and undo. A presentational `CommandBar` collects text and shows suggestion chips + a status line.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (component tests via `react-dom/server` `renderToStaticMarkup`).

**Scope note:** This is Plan 1 of 2 from `docs/superpowers/specs/2026-06-19-ai-beat-commands-design.md`. It covers the deterministic core (spec phases 1 + part of 2). The `CommandAction` union here intentionally implements only `selectStyle | setTempo | setSwing | unknown`; Plan 2 extends it with `adjustIntensity | applyTransform | generateLane` plus the `/api/command` + `/api/coach` serverless endpoints and the Web Speech voice layer.

## Global Constraints

- The only CI/quality gate that runs on this repo is local `npm run check` (hygiene + `typecheck:scripts` + `vitest run`). Every task must end green on `npm run check`. (Bot reviews do not run — CodeRabbit credits are exhausted.)
- New `src/lib/*` files must not import from `src/components/*` (enforced by `npm run hygiene` / `scripts/check-module-hygiene.ts`). `commandActions`, `commandFastPath`, and `commandBus` live in `src/lib` and import only from `src/lib`.
- Lane ids are exactly: `kick`, `snare`, `hat`, `openHat`, `clap`, `808`, `melody` (`InstrumentId`).
- Style ids are exactly: `trap`, `crunk`, `drill`, `rnb`, `pop`, `afrobeats`, `amapiano`, `house`, `bounce` (`BeatStyleId`).
- BPM is clamped to 60–180 and swing to 0–30% by the existing domain functions — never re-implement clamping.
- `updateSequencerSwing` takes a **percent** (0–30) and stores `percent / 100`; `sequencer.swing` is the 0–0.30 fraction. Use `getSwingPercent(sequencer.swing)` to read the current percent.

---

### Task 1: `CommandAction` contract

**Files:**
- Create: `src/lib/commandActions.ts`
- Create: `src/lib/commandActions.test.ts`

**Interfaces:**
- Consumes: `BeatStyleId` from `./beatStyles`.
- Produces: `type CommandAction` (discriminated union, `kind` discriminant) and `function isCommandAction(value: unknown): value is CommandAction`. Later tasks import `CommandAction`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/commandActions.test.ts
import { describe, expect, it } from "vitest";
import { isCommandAction, type CommandAction } from "./commandActions";

describe("isCommandAction", () => {
  it("accepts a valid selectStyle action", () => {
    const action: CommandAction = { kind: "selectStyle", styleId: "bounce" };
    expect(isCommandAction(action)).toBe(true);
  });

  it("rejects an object with an unknown kind", () => {
    expect(isCommandAction({ kind: "explode" })).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(isCommandAction("setTempo")).toBe(false);
    expect(isCommandAction(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/commandActions.test.ts`
Expected: FAIL — cannot find module `./commandActions`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/commandActions.ts
import type { BeatStyleId } from "./beatStyles";

/**
 * The contract between the natural-language layer and the app. The LLM
 * intent-parser (Plan 2) returns one of these; the fast-path produces them
 * locally; `applyAction` is the only consumer that mutates state.
 */
export type CommandAction =
  | { kind: "selectStyle"; styleId: BeatStyleId }
  | { kind: "setTempo"; mode: "absolute"; bpm: number }
  | { kind: "setTempo"; mode: "relative"; deltaBpm: number }
  | { kind: "setSwing"; mode: "absolute"; swingPercent: number }
  | { kind: "setSwing"; mode: "relative"; deltaPercent: number }
  | { kind: "unknown"; reason: string };

const ACTION_KINDS = new Set([
  "selectStyle",
  "setTempo",
  "setSwing",
  "unknown",
]);

export function isCommandAction(value: unknown): value is CommandAction {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind: unknown }).kind === "string" &&
    ACTION_KINDS.has((value as { kind: string }).kind)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/commandActions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/commandActions.ts src/lib/commandActions.test.ts
git commit -m "feat: add CommandAction contract for beat commands"
```

---

### Task 2: Deterministic fast-path parser

**Files:**
- Create: `src/lib/commandFastPath.ts`
- Create: `src/lib/commandFastPath.test.ts`

**Interfaces:**
- Consumes: `CommandAction` from `./commandActions`, `BeatStyleId` from `./beatStyles`.
- Produces: `function parseFastPath(input: string): CommandAction | null` plus exported constants `TEMPO_STEP_BPM = 8` and `SWING_STEP_PERCENT = 5`. Returns `null` when no keyword matches (caller escalates to the LLM in Plan 2).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/commandFastPath.test.ts
import { describe, expect, it } from "vitest";
import { parseFastPath, TEMPO_STEP_BPM, SWING_STEP_PERCENT } from "./commandFastPath";

describe("parseFastPath", () => {
  it("maps style names to selectStyle", () => {
    expect(parseFastPath("make it trap")).toEqual({ kind: "selectStyle", styleId: "trap" });
    expect(parseFastPath("New Orleans bounce please")).toEqual({ kind: "selectStyle", styleId: "bounce" });
    expect(parseFastPath("give me some house")).toEqual({ kind: "selectStyle", styleId: "house" });
  });

  it("maps slow/fast to a relative tempo nudge", () => {
    expect(parseFastPath("slow it down")).toEqual({ kind: "setTempo", mode: "relative", deltaBpm: -TEMPO_STEP_BPM });
    expect(parseFastPath("faster")).toEqual({ kind: "setTempo", mode: "relative", deltaBpm: TEMPO_STEP_BPM });
  });

  it("maps swing phrases, preferring 'less' over the generic match", () => {
    expect(parseFastPath("more swing")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT });
    expect(parseFastPath("less swing")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT });
    expect(parseFastPath("tighter")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT });
  });

  it("does not mistake 'bouncier' for the bounce style", () => {
    expect(parseFastPath("make it bouncier")).toEqual({ kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT });
  });

  it("returns null for empty or unrecognized input", () => {
    expect(parseFastPath("")).toBeNull();
    expect(parseFastPath("   ")).toBeNull();
    expect(parseFastPath("teach me to juggle")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/commandFastPath.test.ts`
Expected: FAIL — cannot find module `./commandFastPath`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/commandFastPath.ts
import type { BeatStyleId } from "./beatStyles";
import type { CommandAction } from "./commandActions";

export const TEMPO_STEP_BPM = 8;
export const SWING_STEP_PERCENT = 5;

// `\bbounce\b` will not match "bouncier" (no trailing word boundary), so the
// swing rules below can safely own that phrase.
const STYLE_KEYWORDS: Array<[RegExp, BeatStyleId]> = [
  [/\b(new orleans|bounce)\b/, "bounce"],
  [/\btrap\b/, "trap"],
  [/\bcrunk\b/, "crunk"],
  [/\bdrill\b/, "drill"],
  [/\b(r&b|rnb|r and b)\b/, "rnb"],
  [/\bpop\b/, "pop"],
  [/\bafrobeats?\b/, "afrobeats"],
  [/\bamapiano\b/, "amapiano"],
  [/\bhouse\b/, "house"],
];

export function parseFastPath(input: string): CommandAction | null {
  const text = input.trim().toLowerCase();
  if (!text) {
    return null;
  }

  for (const [pattern, styleId] of STYLE_KEYWORDS) {
    if (pattern.test(text)) {
      return { kind: "selectStyle", styleId };
    }
  }

  if (/\b(slow(er)?|slow it down|slow down|chill|half ?time)\b/.test(text)) {
    return { kind: "setTempo", mode: "relative", deltaBpm: -TEMPO_STEP_BPM };
  }
  if (/\b(fast(er)?|speed (it )?up|hurry|pick it up)\b/.test(text)) {
    return { kind: "setTempo", mode: "relative", deltaBpm: TEMPO_STEP_BPM };
  }

  // Check the "less" phrasings before the generic "swing" so they win.
  if (/\b(less swing|tighter|straight(er)?)\b/.test(text)) {
    return { kind: "setSwing", mode: "relative", deltaPercent: -SWING_STEP_PERCENT };
  }
  if (/\b(more swing|swing|bouncier|looser)\b/.test(text)) {
    return { kind: "setSwing", mode: "relative", deltaPercent: SWING_STEP_PERCENT };
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/commandFastPath.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/commandFastPath.ts src/lib/commandFastPath.test.ts
git commit -m "feat: add deterministic fast-path command parser"
```

---

### Task 3: Command bus (`applyAction` + `describeAction`)

**Files:**
- Create: `src/lib/commandBus.ts`
- Create: `src/lib/commandBus.test.ts`

**Interfaces:**
- Consumes: `CommandAction` from `./commandActions`; `SequencerState` + `createDefaultSequencerState` from `./patternState`; `updateSequencerBpm`, `updateSequencerSwing`, `getSwingPercent` from `./sequencerDomain`; `BEAT_STYLES` from `./beatStyles`.
- Produces: `function applyAction(action: CommandAction, sequencer: SequencerState): SequencerState` (returns the same reference for `unknown`) and `function describeAction(action: CommandAction): string` (user-facing toast text).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/commandBus.test.ts
import { describe, expect, it } from "vitest";
import { applyAction, describeAction } from "./commandBus";
import { createDefaultSequencerState } from "./patternState";
import { getSwingPercent } from "./sequencerDomain";
import { BEAT_STYLES } from "./beatStyles";

describe("applyAction", () => {
  it("selectStyle loads that style's tempo and pattern", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction({ kind: "selectStyle", styleId: "bounce" }, start);
    expect(next.styleId).toBe("bounce");
    expect(next.bpm).toBe(BEAT_STYLES.bounce.bpm);
  });

  it("setTempo relative nudges and clamps to the 60-180 range", () => {
    const start = { ...createDefaultSequencerState("trap"), bpm: 178 };
    const next = applyAction({ kind: "setTempo", mode: "relative", deltaBpm: 8 }, start);
    expect(next.bpm).toBe(180);
  });

  it("setSwing relative changes swing by the given percent", () => {
    const start = createDefaultSequencerState("trap");
    const before = getSwingPercent(start.swing);
    const next = applyAction({ kind: "setSwing", mode: "relative", deltaPercent: 5 }, start);
    expect(getSwingPercent(next.swing)).toBe(Math.min(30, before + 5));
  });

  it("unknown returns the same state reference unchanged", () => {
    const start = createDefaultSequencerState("trap");
    const next = applyAction({ kind: "unknown", reason: "no-match" }, start);
    expect(next).toBe(start);
  });
});

describe("describeAction", () => {
  it("names the style on selectStyle", () => {
    expect(describeAction({ kind: "selectStyle", styleId: "bounce" })).toContain(BEAT_STYLES.bounce.name);
  });

  it("gives a friendly hint on unknown", () => {
    expect(describeAction({ kind: "unknown", reason: "x" }).toLowerCase()).toContain("try");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/commandBus.test.ts`
Expected: FAIL — cannot find module `./commandBus`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/commandBus.ts
import { BEAT_STYLES } from "./beatStyles";
import type { CommandAction } from "./commandActions";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import {
  getSwingPercent,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./sequencerDomain";

/** Pure: maps an action onto a new SequencerState using existing domain rules. */
export function applyAction(
  action: CommandAction,
  sequencer: SequencerState,
): SequencerState {
  switch (action.kind) {
    case "selectStyle":
      return createDefaultSequencerState(action.styleId);
    case "setTempo": {
      const bpm =
        action.mode === "absolute"
          ? action.bpm
          : sequencer.bpm + action.deltaBpm;
      return updateSequencerBpm(sequencer, bpm);
    }
    case "setSwing": {
      const percent =
        action.mode === "absolute"
          ? action.swingPercent
          : getSwingPercent(sequencer.swing) + action.deltaPercent;
      return updateSequencerSwing(sequencer, percent);
    }
    case "unknown":
      return sequencer;
  }
}

/** Pure: a short human-facing confirmation for the command bar status line. */
export function describeAction(action: CommandAction): string {
  switch (action.kind) {
    case "selectStyle":
      return `Switched to ${BEAT_STYLES[action.styleId].name}.`;
    case "setTempo":
      if (action.mode === "absolute") {
        return `Set the tempo to ${action.bpm} BPM.`;
      }
      return action.deltaBpm < 0 ? "Slowed the tempo down." : "Sped the tempo up.";
    case "setSwing":
      if (action.mode === "absolute") {
        return `Set the swing to ${action.swingPercent}%.`;
      }
      return action.deltaPercent < 0 ? "Tightened the swing." : "Loosened the swing.";
    case "unknown":
      return 'I didn’t catch that. Try: "slower", "more swing", or "make it trap".';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/commandBus.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/commandBus.ts src/lib/commandBus.test.ts
git commit -m "feat: add command bus applyAction/describeAction"
```

---

### Task 4: `CommandBar` UI + wire into `App.tsx`

**Files:**
- Create: `src/components/CommandBar.tsx`
- Create: `src/components/CommandBar.test.tsx`
- Modify: `src/App.tsx` (imports near line 17; new state + handler near the other `applySequencerState` handlers ~line 475; render after `<StyleSelector .../>` ~line 971)
- Modify: `src/styles.css` (append `.command-bar` styles)

**Interfaces:**
- Consumes: `applyAction`, `describeAction` from `../lib/commandBus`; `parseFastPath` from `../lib/commandFastPath`; `CommandAction` from `../lib/commandActions`.
- Produces: `interface CommandSuggestion { label: string; command: string }`, `interface CommandBarProps { suggestions: CommandSuggestion[]; statusMessage: string | null; onSubmit: (text: string) => void }`, and `function CommandBar(props: CommandBarProps)`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/CommandBar.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandBar, type CommandSuggestion } from "./CommandBar";

function noop() {}

const suggestions: CommandSuggestion[] = [
  { label: "Make it bounce", command: "make it bounce" },
  { label: "Slower", command: "slower" },
];

describe("CommandBar", () => {
  it("renders the input, suggestion chips, and the section label", () => {
    const html = renderToStaticMarkup(
      <CommandBar suggestions={suggestions} statusMessage={null} onSubmit={noop} />,
    );
    expect(html).toContain("Tell the beat what to do");
    expect(html).toContain("Make it bounce");
    expect(html).toContain("Slower");
  });

  it("renders the status message when present", () => {
    const html = renderToStaticMarkup(
      <CommandBar suggestions={suggestions} statusMessage="Slowed the tempo down." onSubmit={noop} />,
    );
    expect(html).toContain("Slowed the tempo down.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CommandBar.test.tsx`
Expected: FAIL — cannot find module `./CommandBar`.

- [ ] **Step 3: Write the `CommandBar` component**

```tsx
// src/components/CommandBar.tsx
import { useState } from "react";

export interface CommandSuggestion {
  label: string;
  command: string;
}

export interface CommandBarProps {
  suggestions: CommandSuggestion[];
  statusMessage: string | null;
  onSubmit: (text: string) => void;
}

export function CommandBar({ suggestions, statusMessage, onSubmit }: CommandBarProps) {
  const [text, setText] = useState("");

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setText("");
  }

  return (
    <section className="panel command-bar" aria-label="Tell the beat what to do">
      <p className="eyebrow">Tell the beat what to do</p>
      <form
        className="command-bar__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(text);
        }}
      >
        <input
          className="command-bar__input"
          type="text"
          value={text}
          placeholder="e.g. make it bounce, slower, more swing"
          aria-label="Beat command"
          onChange={(event) => setText(event.target.value)}
        />
        <button className="star-button" type="submit">
          Go
        </button>
      </form>
      <div className="command-bar__chips">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.command}
            type="button"
            className="button secondary compact"
            onClick={() => submit(suggestion.command)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      {statusMessage && (
        <p className="command-bar__status" role="status">
          {statusMessage}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CommandBar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire `CommandBar` into `App.tsx`**

Add to the component imports (near line 17, beside the other component imports):

```tsx
import { CommandBar, type CommandSuggestion } from "./components/CommandBar";
import { applyAction, describeAction } from "./lib/commandBus";
import { parseFastPath } from "./lib/commandFastPath";
```

Add a module-level constant near the top of the file (outside the component, beside other top-level constants):

```tsx
const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { label: "Make it bounce", command: "make it bounce" },
  { label: "Slower", command: "slower" },
  { label: "More swing", command: "more swing" },
  { label: "Make it trap", command: "make it trap" },
];
```

Add state beside the other `useState` hooks (near line 228):

```tsx
const [commandStatus, setCommandStatus] = useState<string | null>(null);
```

Add the handler beside the other `applySequencerState` handlers (after `updateBpm`, ~line 526):

```tsx
function handleCommand(text: string) {
  const action = parseFastPath(text) ?? { kind: "unknown" as const, reason: "no-match" };
  const next = applyAction(action, sequencer);
  if (next !== sequencer) {
    applySequencerState(next);
  }
  setCommandStatus(describeAction(action));
}
```

Render the bar immediately after the closing `/>` of `<StyleSelector ... />` (~line 976):

```tsx
<CommandBar
  suggestions={COMMAND_SUGGESTIONS}
  statusMessage={commandStatus}
  onSubmit={handleCommand}
/>
```

- [ ] **Step 6: Append styles**

Append to `src/styles.css`:

```css
.command-bar__form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.command-bar__input {
  flex: 1;
  min-width: 0;
}

.command-bar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.command-bar__status {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  opacity: 0.85;
}
```

- [ ] **Step 7: Verify the full gate passes**

Run: `npm run check`
Expected: hygiene passes, `typecheck:scripts` passes, all tests PASS (including the new suites).

- [ ] **Step 8: Verify in the browser (manual)**

Run: `npm run dev`, open the app, and confirm: typing "make it bounce" switches the style; "slower" drops the BPM; "more swing" raises swing; a gibberish command shows the "I didn't catch that" hint; clicking each suggestion chip runs its command. Stop the dev server when done.

- [ ] **Step 9: Commit**

```bash
git add src/components/CommandBar.tsx src/components/CommandBar.test.tsx src/App.tsx src/styles.css
git commit -m "feat: add natural-language command bar (fast-path, offline)"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):**
- Text-first command input → Task 4 (`CommandBar`). ✅
- Deterministic fast-path ("deterministic before AI") → Task 2. ✅
- Switch style / tempo / swing commands → Tasks 2–3. ✅
- Action contract reused later by Gemini → Task 1 (`CommandAction`). ✅
- Suggestion chips (beginner guide) → Task 4. ✅
- Reuse existing mutation path for undo/clamping → Task 3 + Task 4 handler via `applySequencerState`. ✅
- Out of Plan 1 scope (tracked for Plan 2): `adjustIntensity`, `applyTransform` (chop & screw), `generateLane`, `/api/command`, `/api/coach`, voice (Web Speech). Documented in the Scope note.

**Placeholder scan:** No TBD/TODO; every code step shows complete code and exact commands.

**Type consistency:** `CommandAction` (Task 1) is imported unchanged by Tasks 2–4. `applyAction`/`describeAction` signatures defined in Task 3 match their use in Task 4's `handleCommand`. `CommandSuggestion`/`CommandBarProps` defined in Task 4 match the test and the App render. Lane/style id literals match the Global Constraints lists.
