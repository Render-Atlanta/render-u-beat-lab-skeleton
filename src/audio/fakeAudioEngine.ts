import type { BeatStyle } from "../lib/beatStyles";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import type { AudioEngine } from "./audioEngine";

/**
 * A lightweight, fully in-memory `AudioEngine` for UI/component tests.
 *
 * It produces no real audio and uses no timers — every call is just recorded so
 * tests can assert that a component started/stopped/disposed the engine, which
 * style it last requested, and which producer tags it played. It is also a
 * faithful stand-in for the real engines: it passes the shared
 * `runAudioEngineContract` suite.
 *
 * `kind` is the literal `"fake"`, which structurally satisfies the `AudioEngine`
 * interface's `kind: AudioEngineKind` member while remaining distinguishable
 * from the production engines in tests. Production code never selects it.
 */
export interface FakeAudioEngine extends AudioEngine {
  readonly kind: AudioEngine["kind"];
  /** True between a `start()` and the next `stop()`/`dispose()`. */
  readonly running: boolean;
  /** True once `dispose()` has been called. */
  readonly disposed: boolean;
  /** Number of times `ready()` has resolved. */
  readonly readyCount: number;
  /** The most recent style passed to `start()`, or null if never started. */
  readonly lastStyle: BeatStyle | null;
  /** Every style passed to `start()`, in order. */
  readonly startedStyles: readonly BeatStyle[];
  /** Every producer-tag input passed to `playProducerTag()`, in order. */
  readonly producerTags: readonly (ProducerTagConfigInput | string)[];
}

export function createFakeAudioEngine(): FakeAudioEngine {
  const startedStyles: BeatStyle[] = [];
  const producerTags: (ProducerTagConfigInput | string)[] = [];
  let running = false;
  let disposed = false;
  let readyCount = 0;

  return {
    // Cast keeps the fake distinguishable in tests without widening the public
    // production `AudioEngineKind` union.
    kind: "fake" as AudioEngine["kind"],
    get running() {
      return running;
    },
    get disposed() {
      return disposed;
    },
    get readyCount() {
      return readyCount;
    },
    get lastStyle() {
      return startedStyles.at(-1) ?? null;
    },
    get startedStyles() {
      return startedStyles;
    },
    get producerTags() {
      return producerTags;
    },
    async ready() {
      readyCount += 1;
    },
    start(style: BeatStyle) {
      startedStyles.push(style);
      running = true;
    },
    stop() {
      running = false;
    },
    dispose() {
      running = false;
      disposed = true;
    },
    playProducerTag(input: ProducerTagConfigInput | string) {
      producerTags.push(input);
    },
  };
}
