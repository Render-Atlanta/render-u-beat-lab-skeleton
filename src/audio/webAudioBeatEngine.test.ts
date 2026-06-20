import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import { createDefaultStepVelocities } from "../lib/stepVelocity";
import { createWebAudioBeatEngine } from "./webAudioBeatEngine";

describe("web audio beat engine adapter", () => {
  it("resumes audio on ready and exposes adapter identity", async () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    await engine.ready();

    expect(engine.kind).toBe("web-audio");
    expect(runtime.contexts[0].resumeCount).toBe(1);
    expect(runtime.contexts[0].state).toBe("running");
  });

  it("starts, restarts, stops, and disposes through the adapter lifecycle", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    engine.start(BEAT_STYLES.trap);
    expect(runtime.intervalCallbacks.size).toBe(1);

    engine.start(BEAT_STYLES.pop);
    expect(runtime.clearedTimerIds).toEqual([1]);
    expect(runtime.intervalCallbacks.size).toBe(1);

    engine.stop();
    expect(runtime.clearedTimerIds).toEqual([1, 2]);
    expect(runtime.intervalCallbacks.size).toBe(0);

    engine.dispose();
    expect(runtime.contexts[0].closeCount).toBe(1);
  });

  it("schedules active drum voices when the runtime tick fires", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    engine.start(BEAT_STYLES.trap);
    runtime.runTimer(1);

    expect(runtime.contexts[0].oscillatorStarts.length).toBeGreaterThanOrEqual(1);
    expect(runtime.contexts[0].bufferSourceStarts.length).toBeGreaterThanOrEqual(1);
  });

  it("applies step velocity to scheduled voice gain", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[0] = 2;

    engine.start({ ...BEAT_STYLES.trap, stepVelocities });
    runtime.runTimer(1);

    expect(runtime.contexts[0].gainSetValues).toContain(0.9 * 1.12 * 1.45);
  });

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

  it("plays recorded producer tag sample through a buffer source", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    engine.setProducerTagSample({ samples: new Float32Array([0.1, 0.2, 0.3]), sampleRate: 22050 });
    engine.playProducerTag({ source: "recorded", trigger: "manual" });

    expect(runtime.contexts[0].bufferSourceStarts.length).toBeGreaterThan(0);
  });

  it("fires the recorded tag at step 0 (loop boundary) when loop config is set", () => {
    const sample = { samples: new Float32Array([0.5, 0.6]), sampleRate: 22050 };

    // Control: sample set, but no loop config — drums only
    const controlRuntime = createFakeRuntime();
    const controlEngine = createWebAudioBeatEngine(controlRuntime);
    controlEngine.setProducerTagSample(sample);
    controlEngine.start(BEAT_STYLES.trap);
    controlRuntime.runTimer(1);
    const controlCount = controlRuntime.contexts[0].bufferSourceStarts.length;

    // Tag: sample + loop config — tag should fire at step 0
    const tagRuntime = createFakeRuntime();
    const tagEngine = createWebAudioBeatEngine(tagRuntime);
    tagEngine.setProducerTagSample(sample);
    tagEngine.setProducerTagConfig({ source: "recorded", trigger: "loop" });
    tagEngine.start(BEAT_STYLES.trap);
    tagRuntime.runTimer(1);
    const tagCount = tagRuntime.contexts[0].bufferSourceStarts.length;

    // Tag engine must start strictly more buffer sources than control (the extra is the tag)
    expect(tagCount).toBeGreaterThan(controlCount);
  });

  it("plays click voice on demand and during metronome quarter notes", () => {
    const runtime = createFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);
    let clickCount = 0;
    runtime.onClickPlayed = () => {
      clickCount += 1;
    };

    engine.playClick(true);
    expect(clickCount).toBe(1);

    engine.setMetronomeEnabled(true);
    engine.start(BEAT_STYLES.trap);
    const before = clickCount;
    runtime.runTimer(1);
    expect(clickCount).toBeGreaterThan(before);

    engine.setMetronomeEnabled(false);
    const afterDisable = clickCount;
    runtime.runTimer(1);
    expect(clickCount).toBe(afterDisable);
  });
});

function createFakeRuntime() {
  const intervalCallbacks = new Map<number, () => void>();
  const clearedTimerIds: number[] = [];
  const contexts: FakeAudioContext[] = [];
  let nextTimerId = 1;

  class RuntimeAudioContext extends FakeAudioContext {
    constructor() {
      super();
      contexts.push(this);
    }
  }

  return {
    contexts,
    intervalCallbacks,
    clearedTimerIds,
    onClickPlayed: undefined as (() => void) | undefined,
    AudioContext: RuntimeAudioContext as unknown as typeof AudioContext,
    setInterval: ((callback: () => void) => {
      const timerId = nextTimerId;
      nextTimerId += 1;
      intervalCallbacks.set(timerId, callback);
      return timerId;
    }) as typeof globalThis.setInterval,
    clearInterval: ((timerId: number) => {
      clearedTimerIds.push(timerId);
      intervalCallbacks.delete(timerId);
    }) as typeof globalThis.clearInterval,
    runTimer(timerId: number) {
      intervalCallbacks.get(timerId)?.();
    },
  };
}

class FakeAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  sampleRate = 44_100;
  destination = new FakeAudioNode();
  resumeCount = 0;
  closeCount = 0;
  oscillatorStarts: number[] = [];
  bufferSourceStarts: number[] = [];
  gainSetValues: number[] = [];

  async resume() {
    this.resumeCount += 1;
    this.state = "running";
  }

  async close() {
    this.closeCount += 1;
    this.state = "closed";
  }

  createGain() {
    return new FakeGainNode(this);
  }

  createOscillator() {
    return new FakeOscillatorNode(this);
  }

  createBufferSource() {
    return new FakeBufferSourceNode(this);
  }

  createBiquadFilter() {
    return new FakeBiquadFilterNode();
  }

  createBuffer(_channels: number, length: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }

  createAnalyser() {
    return new FakeAnalyserNode();
  }
}

class FakeAudioNode {
  connect<T>(node: T): T {
    return node;
  }
}

class FakeGainNode extends FakeAudioNode {
  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  gain = {
    value: 0,
    setValueAtTime: (value: number) => {
      this.context.gainSetValues.push(value);
    },
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  };
}

class FakeOscillatorNode extends FakeAudioNode {
  type: OscillatorType = "sine";
  frequency = {
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  };

  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  start(time: number) {
    this.context.oscillatorStarts.push(time);
  }

  stop() {
    return undefined;
  }
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: unknown = null;

  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  start(time: number) {
    this.context.bufferSourceStarts.push(time);
  }
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = "lowpass";
  frequency = { value: 0 };
  Q = { value: 0 };
}

class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 2048;
  frequencyBinCount = 128;
  getByteFrequencyData(_array: Uint8Array) {
    return undefined;
  }
}
