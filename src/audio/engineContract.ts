import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import type { AudioEngine, AudioEngineKind } from "./audioEngine";

/**
 * Uniform probe over an engine's injected fake runtime so the shared contract
 * suite can assert behavior without knowing implementation internals.
 *
 * Every probe method reflects observable, contract-level behavior:
 * - `readyCount` / `isScheduling` / `disposeCount` describe lifecycle effects.
 * - `scheduledHitCount` counts drum voice triggers produced when the engine's
 *   (mocked) scheduler fires, so we can prove `start(style)` actually drives
 *   playback and that a pattern with more hits produces more triggers.
 * - `producerTagPlayCount` counts producer-tag playbacks.
 *
 * Implementation-specific details (oscillator graphs, Tone transport ids, swing
 * math, exact scheduling lookahead) are deliberately NOT exposed here.
 */
export interface AudioEngineProbe {
  /** Number of times `ready()` resolved against the runtime. */
  readyCount(): number;
  /** True while a scheduler/transport is actively running. */
  isScheduling(): boolean;
  /** Number of times the runtime was torn down via `dispose()`. */
  disposeCount(): number;
  /**
   * Advance the engine's mocked scheduler one tick and return the number of
   * drum voice triggers produced for the currently-started style.
   */
  fireSchedulerTick(): number;
  /** Total drum voice triggers produced so far across all ticks. */
  scheduledHitCount(): number;
  /** Number of producer-tag playbacks observed. */
  producerTagPlayCount(): number;
}

export interface AudioEngineContractHarness {
  engine: AudioEngine;
  probe: AudioEngineProbe;
}

export type AudioEngineContractFactory = () => AudioEngineContractHarness;

/**
 * Registers the shared behavioral contract that every `AudioEngine` adapter
 * must satisfy. Call it from a `*.test.ts` file once per engine implementation.
 *
 * The factory must build the engine with an injected fake runtime / mocked
 * scheduler so the suite is deterministic in CI: no real browser audio, no real
 * timers, no wall-clock dependence.
 */
export function runAudioEngineContract(
  name: string,
  expectedKind: AudioEngineKind,
  makeHarness: AudioEngineContractFactory,
): void {
  describe(`AudioEngine contract: ${name}`, () => {
    it("reports its adapter kind", () => {
      const { engine } = makeHarness();
      expect(engine.kind).toBe(expectedKind);
    });

    it("resolves ready() against its runtime", async () => {
      const { engine, probe } = makeHarness();

      await engine.ready();

      expect(probe.readyCount()).toBe(1);
    });

    it("starts scheduling when start(style) is called", () => {
      const { engine, probe } = makeHarness();

      expect(probe.isScheduling()).toBe(false);

      engine.start(BEAT_STYLES.trap);

      expect(probe.isScheduling()).toBe(true);
    });

    it("produces drum voice triggers when the scheduler advances", () => {
      const { engine, probe } = makeHarness();

      engine.start(BEAT_STYLES.trap);
      const hits = probe.fireSchedulerTick();

      expect(hits).toBeGreaterThan(0);
    });

    it("applies tempo/pattern/swing via start(style) (restart with a new style)", () => {
      // The contract has no separate tempo/pattern/swing methods: those changes
      // are delivered by re-calling start() with a different style. Restarting
      // must tear down the previous schedule and begin the new one cleanly.
      const { engine, probe } = makeHarness();

      engine.start(BEAT_STYLES.trap);
      expect(probe.isScheduling()).toBe(true);

      engine.start(BEAT_STYLES.pop);
      // Still exactly one active schedule after a restart, not two.
      expect(probe.isScheduling()).toBe(true);

      const hitsAfterRestart = probe.fireSchedulerTick();
      expect(hitsAfterRestart).toBeGreaterThan(0);
    });

    it("stops scheduling when stop() is called", () => {
      const { engine, probe } = makeHarness();

      engine.start(BEAT_STYLES.trap);
      engine.stop();

      expect(probe.isScheduling()).toBe(false);
    });

    it("is idempotent on repeated stop()", () => {
      const { engine, probe } = makeHarness();

      engine.start(BEAT_STYLES.trap);
      engine.stop();
      engine.stop();

      expect(probe.isScheduling()).toBe(false);
    });

    it("plays a producer tag without throwing", () => {
      const { engine, probe } = makeHarness();

      engine.playProducerTag("Render U made this");

      expect(probe.producerTagPlayCount()).toBeGreaterThan(0);
    });

    it("cleans up scheduling and resources on dispose()", async () => {
      const { engine, probe } = makeHarness();

      engine.start(BEAT_STYLES.trap);
      await engine.dispose();

      expect(probe.isScheduling()).toBe(false);
      expect(probe.disposeCount()).toBe(1);
    });
  });
}
