import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
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

  async resume() {
    this.resumeCount += 1;
    this.state = "running";
  }

  async close() {
    this.closeCount += 1;
    this.state = "closed";
  }

  createGain() {
    return new FakeGainNode();
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
}

class FakeAudioNode {
  connect<T>(node: T): T {
    return node;
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = {
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
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
