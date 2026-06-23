import type { BeatStyle } from "../lib/beatStyles";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import type { AudioEngine, ProducerTagSample } from "./audioEngine";

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
  /** Test hook: set the value returned by getActiveStep(). */
  setActiveStepForTest(step: number | null): void;
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
  /** Every style passed to `queueStyle()`, in order. */
  readonly queuedStyles: readonly BeatStyle[];
  /** Every producer-tag input passed to `playProducerTag()`, in order. */
  readonly producerTags: readonly (ProducerTagConfigInput | string)[];
  /** The producer tag sample currently set, or null. */
  readonly producerTagSample: ProducerTagSample | null;
  setProducerTagSample(sample: ProducerTagSample | null): void;
  /** The producer tag config currently set, or null. */
  readonly producerTagConfig: ProducerTagConfigInput | null;
  setProducerTagConfig(config: ProducerTagConfigInput | null): void;
  readonly clickCalls: readonly boolean[];
  readonly metronomeEnabled: boolean;
}

export function createFakeAudioEngine(): FakeAudioEngine {
  const startedStyles: BeatStyle[] = [];
  const queuedStyles: BeatStyle[] = [];
  const producerTags: (ProducerTagConfigInput | string)[] = [];
  let running = false;
  let disposed = false;
  let readyCount = 0;
  let activeStep: number | null = null;
  let tagSample: ProducerTagSample | null = null;
  let tagConfig: ProducerTagConfigInput | null = null;
  const clickCalls: boolean[] = [];
  let metronomeEnabled = false;

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
    get queuedStyles() {
      return queuedStyles;
    },
    get producerTags() {
      return producerTags;
    },
    get producerTagSample() {
      return tagSample;
    },
    setProducerTagSample(sample: ProducerTagSample | null) {
      tagSample = sample;
    },
    get producerTagConfig() {
      return tagConfig;
    },
    setProducerTagConfig(config: ProducerTagConfigInput | null) {
      tagConfig = config;
    },
    async ready() {
      readyCount += 1;
    },
    start(style: BeatStyle) {
      startedStyles.push(style);
      running = true;
    },
    queueStyle(style: BeatStyle) {
      queuedStyles.push(style);
    },
    stop() {
      running = false;
      activeStep = null;
    },
    dispose() {
      running = false;
      disposed = true;
      activeStep = null;
    },
    playProducerTag(input: ProducerTagConfigInput | string) {
      producerTags.push(input);
    },
    getActiveStep() {
      return activeStep;
    },
    getFrequencyData() {
      return false;
    },
    playClick(accent = false) {
      clickCalls.push(accent);
    },
    setMetronomeEnabled(enabled: boolean) {
      metronomeEnabled = enabled;
    },
    get clickCalls() {
      return clickCalls;
    },
    get metronomeEnabled() {
      return metronomeEnabled;
    },
    setActiveStepForTest(step: number | null) {
      activeStep = step;
    },
  };
}
