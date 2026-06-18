# Audio engine contract

Every audio engine adapter implements the same `AudioEngine` interface
(`src/audio/audioEngine.ts`):

```ts
interface AudioEngine {
  readonly kind: AudioEngineKind;
  ready(): Promise<void>;
  start(style: BeatStyle): void;
  stop(): void;
  dispose(): void | Promise<void>;
  playProducerTag(input: ProducerTagConfigInput | string): void;
}
```

Because the app only talks to this interface, the Web Audio synth engine and the
Tone.js sample engine are interchangeable. A shared contract test suite
(`src/audio/engineContract.ts`) encodes the behavior that every adapter must
satisfy, and `src/audio/engineContract.test.ts` runs it against all three
engines: `web-audio`, `tone-sample`, and the in-memory `fake` engine.

## How to add an engine to the contract

Call `runAudioEngineContract(name, expectedKind, makeHarness)` from a test file.
The harness builds the engine with an injected fake runtime and returns a
uniform `AudioEngineProbe` so the suite can assert behavior without knowing
implementation internals.

## Contract-level behaviors (every engine must satisfy)

These are asserted by the shared suite:

- **Adapter identity** — `kind` reports the expected engine kind.
- **Ready** — `ready()` resolves against the engine's runtime (resumes/starts
  the underlying audio context/transport).
- **Play** — `start(style)` begins scheduling, and advancing the (mocked)
  scheduler produces drum voice triggers.
- **Tempo / pattern / swing updates** — there are **no** separate tempo, pattern,
  or swing methods on the interface. The `BeatStyle` passed to `start(style)`
  carries `bpm`, `pattern`, and `swing`, so changing any of them is done by
  calling `start()` again with a new style. The contract verifies that
  restarting tears down the previous schedule and cleanly begins the new one
  (exactly one active schedule, still producing triggers).
- **Stop** — `stop()` halts scheduling and is idempotent on repeated calls.
- **Producer tag** — `playProducerTag(input)` plays (or falls back) without
  throwing.
- **Cleanup** — `dispose()` stops scheduling and releases resources.

## Implementation-specific behaviors (NOT in the contract)

These differ per engine and are covered by each engine's own unit test, not the
shared suite:

- **Scheduling internals** — the Web Audio engine uses a `setInterval`
  lookahead scheduler over an `AudioContext`; the Tone.js engine uses
  `Transport.scheduleRepeat` with a `16n` interval. The contract only checks
  that *some* scheduler runs and produces triggers, not how.
- **Swing math and step timing** — how `swing`/`bpm` map to concrete event
  times (`getSwingStepDurationSeconds`, Tone's `swingSubdivision`, etc.).
- **Voice synthesis** — oscillator/noise graphs vs. Tone synths/sample players,
  envelopes, filter settings, and accent scaling.
- **Producer-tag delivery** — speech synthesis vs. open-hat fallback and the
  exact fallback chain.

## Determinism in CI

The suite never touches real browser audio or wall-clock time:

- The **web-audio** harness injects a fake `AudioContext` plus fake
  `setInterval`/`clearInterval`, and "advances" time by invoking the captured
  interval callback directly.
- The **tone-sample** harness injects a fake `ToneRuntimePort` (fake transport
  and voices) and "advances" by calling the captured `scheduleRepeat` callback
  directly.
- The **fake** engine records calls only; it uses no timers or audio at all.

## Fake engine for UI tests

`src/audio/fakeAudioEngine.ts` exports `createFakeAudioEngine()`, a lightweight
in-memory `AudioEngine` for component/UI tests. It produces no audio and uses no
timers — it records `running`, `disposed`, `readyCount`, `lastStyle`,
`startedStyles`, and `producerTags` so tests can assert that a component
started/stopped/disposed the engine and which style/tags it requested. Running
the shared contract against it proves it is a faithful stand-in for the real
engines.
