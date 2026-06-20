# AI Beat Commands — Design

**Date:** 2026-06-19
**Status:** Approved (brainstorm), pending implementation plan
**One-liner:** Let users steer the beat with natural language ("make it New Orleans
Bounce", "slow down", "make the bass harder", "chop and screw it") via a text command
bar — voice as a thin layer — backed by Gemini 2.5-flash for intent parsing, with all
audio mutations performed by deterministic, testable app code.

## Goals

- Natural-language control of the sequencer that maps onto **existing** app actions.
- The feature's *construction* is a workshop teaching artifact: a clean
  NL → structured-action → deterministic-mutation pipeline (LLM tool-calling pattern).
- Reliable enough to demo live on flaky wifi (deterministic fast-path, graceful failure).
- Beginner support: suggestion chips **and** a conversational coach Q&A.

## Non-goals (v1)

- Voice-first UX (voice is an optional, removable layer over the text box).
- LLM-generated audio/patterns in the live path (generation is deterministic).
- Multi-turn command memory / undo-by-voice (undo already exists via history).
- Any client-side LLM key exposure.

## Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Primary context | Both a live demo **and** the teaching lesson — show the AI wiring, stay reliable. |
| Input mode | **Text first**, voice (Web Speech) as a thin removable layer. |
| Command categories | Switch style · tempo & swing · intensity/mix · transform & generate (all four). |
| Beginner guide mode | **Both** — suggestion chips + conversational coach Q&A. |
| Architecture | **Approach A** — serverless intent-parser + deterministic command bus + regex fast-path. |
| Model | Gemini 2.5-flash (user-provided key), server-side only. |

## Architecture (Approach A)

```
text / voice
   │
   ▼
parseFastPath(text)  ──hit──►  Action ──┐
   │ (null = miss)                      │
   ▼                                    ▼
POST /api/command  ──►  Gemini 2.5-flash (responseSchema = Action union)
   │                                    │
   ▼                                    ▼
                                  applyAction(action, sequencer): SequencerState
                                        │
                                        ▼
                                  applySequencerState(...)  → history / undo / audio
```

The LLM **only** translates language into a validated `Action`. It never touches audio,
patterns, or BPM directly. Every mutation runs through existing domain functions, so it
inherits clamping (BPM 60–180, swing 0–30%), history, and undo.

## Components

### `src/lib/commandActions.ts` — the contract

A discriminated union that doubles as Gemini's structured-output schema:

```ts
type Action =
  | { kind: "selectStyle"; styleId: BeatStyleId }
  | { kind: "setTempo"; mode: "absolute" | "relative"; bpm?: number; deltaBpm?: number }
  | { kind: "setSwing"; mode: "absolute" | "relative"; swingPercent?: number; deltaPercent?: number }
  | { kind: "adjustIntensity"; lane: InstrumentId; direction: "harder" | "softer" | "busier" | "sparser" }
  | { kind: "applyTransform"; preset: "chopAndScrew" }
  | { kind: "generateLane"; lane: InstrumentId; flavor: "funky" | "simple" | "driving" }
  | { kind: "unknown"; reason: string };
```

- `styleId` / `lane` are constrained to the existing id unions (`BeatStyleId`,
  `InstrumentId`) so the model cannot invent values.
- `unknown` is a first-class, testable outcome — drives a friendly "I didn't get that"
  response instead of an error.

### `src/lib/commandBus.ts` — pure dispatcher

```ts
applyAction(action: Action, sequencer: SequencerState): SequencerState
```

Maps each `kind` to existing domain functions:

| kind | implementation |
|---|---|
| `selectStyle` | build `SequencerState` from `BEAT_STYLES[styleId]` |
| `setTempo` | `updateSequencerBpm` (resolve relative against current bpm) |
| `setSwing` | `updateSequencerSwing` (resolve relative against current swing) |
| `adjustIntensity` | velocity / step-density change for the lane |
| `applyTransform` | delegate to `beatTransforms.chopAndScrew` |
| `generateLane` | delegate to `beatTransforms.generateLane` |
| `unknown` | return `sequencer` unchanged |

No network, no audio, no React — pure and fully unit-testable.

### `src/lib/commandFastPath.ts` — deterministic-first

`parseFastPath(text: string): Action | null` — keyword/regex match for obvious commands
("slower", "faster", "trap", "more swing", style names). Tried before any network call.
`null` means "escalate to Gemini". Instant, free, offline-safe; teaches deterministic-before-AI.

### `src/lib/beatTransforms.ts` — pure transforms/generators

- `chopAndScrew(state)` → BPM × ~0.7 (clamped to MIN_BPM 60), swing → heavy (~18%),
  pitch bass/melody lanes down. Mirrors the Houston technique.
- `generateLane(lane, flavor, style)` → seeded deterministic step pattern keyed off the
  current style. No LLM in the audio path.

### `api/command.ts` — Vercel serverless function

- Input: `{ text, context }` where `context` is a compact pattern summary (style, bpm,
  swing, active lanes).
- Calls Gemini 2.5-flash with `responseSchema` = Action union + system prompt listing
  valid styles/lanes.
- Returns a validated `Action`. Any timeout/parse failure → `{ kind: "unknown", reason }`.
  Never throws a 500 that breaks the demo.
- Provider: AI SDK `generateObject` + `@ai-sdk/google` (`GOOGLE_GENERATIVE_AI_API_KEY`),
  optionally via Vercel AI Gateway for model swap-ability.

### `api/coach.ts` — Vercel serverless function

- Input: `{ question, context }`. Returns grounded teaching text.
- System prompt seeded from `beatCoach` / style `lesson` fields to stay factual.

### Client transport — `src/lib/commandClient.ts` + `fakeCommandClient.ts`

Mirrors the `audioEngine` / `fakeAudioEngine` pattern so UI is testable without network.

### UI

- `src/components/CommandBar.tsx` — text input, mic toggle (Web Speech, thin/removable),
  suggestion chips. Flow: fast-path → else `/api/command` → `applyAction`. Shows a
  one-line "what I did" toast in the existing beat-coach voice. Loading/disabled state
  prevents double-fire.
- Extend the coach tool / `BeatCoachPanel` with a Q&A box hitting `/api/coach`.

## Data flow

1. User types/speaks → `CommandBar`.
2. `parseFastPath` tries locally. Hit → skip to step 5.
3. Miss → `commandClient.command(text, context)` → `/api/command` → Gemini → `Action`.
4. `Action` returned to client.
5. `applyAction(action, sequencer)` → new `SequencerState`.
6. `applySequencerState(next)` → history + audio update (existing path; undo works).
7. Toast confirms; `unknown` shows a friendly retry hint.

## Error handling

- Network/LLM failure → `{ kind: "unknown" }`; UI suggests a fast-path example.
- Out-of-range values clamped by existing domain functions (defense in depth).
- Web Speech unsupported/denied → mic hidden, text box still works.
- Key absent in dev → `/api/command` returns `unknown` with a clear server log.

## Testing (gates on `npm run check`)

- Pure unit tests for `commandBus`, `commandFastPath`, `beatTransforms` (bulk of coverage).
- Shared schema fixtures in `commandActions` used by both client tests and endpoint
  expectations.
- `CommandBar` tested against `fakeCommandClient` (no network/LLM).
- Module hygiene: new files conform to existing import-boundary rules.

## Phasing (PR-per-slice, matching existing workflow)

1. `commandActions` + `commandBus` + `commandFastPath` + tests — **no LLM**; proves the pipeline.
2. `api/command` + `CommandBar` (text) — style / tempo / swing / intensity live.
3. `beatTransforms` — chop-&-screw + bassline generator.
4. `api/coach` + coach-panel Q&A.
5. Voice layer (Web Speech) + suggestion chips.

## New / touched files

**New:** `src/lib/commandActions.ts`, `src/lib/commandBus.ts`, `src/lib/commandFastPath.ts`,
`src/lib/beatTransforms.ts`, `src/lib/commandClient.ts`, `src/lib/fakeCommandClient.ts`,
`src/components/CommandBar.tsx`, `api/command.ts`, `api/coach.ts` (+ co-located tests).

**Touched:** `src/App.tsx` (wire CommandBar to `applySequencerState`),
`src/components/BeatCoachPanel.tsx` (Q&A), `package.json` (AI SDK deps),
`vercel.json` (functions), `.env.local` (gitignored key).

## Risks / open items

- Web Speech browser support (Chrome strong, Safari/Firefox patchy) — mitigated by
  text-first and feature-detection.
- Gemini latency on stage — mitigated by fast-path + loading guard; consider a short
  client timeout that falls back to `unknown`.
- Workshop offline scenario — fast-path covers the common live commands without network.
- Prompt drift between `commandActions` union and endpoint schema — keep the schema
  defined once and imported by the endpoint.
