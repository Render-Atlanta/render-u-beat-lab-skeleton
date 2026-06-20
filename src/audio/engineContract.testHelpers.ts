import type {
  LaneVolumePort,
  ToneRuntimePort,
  ToneTransportPort,
  ToneVoicePort,
} from "./toneSampleBeatEngine";
import type { WebAudioBeatEngineRuntime } from "./webAudioBeatEngine";

export function createWebAudioFakeRuntime(): WebAudioBeatEngineRuntime & {
  contexts: WebAudioFakeContext[];
  intervalCallbacks: Map<number, () => void>;
  totalVoiceStarts(): number;
} {
  const intervalCallbacks = new Map<number, () => void>();
  const contexts: WebAudioFakeContext[] = [];
  let nextTimerId = 1;

  class RuntimeAudioContext extends WebAudioFakeContext {
    constructor() {
      super();
      contexts.push(this);
    }
  }

  return {
    contexts,
    intervalCallbacks,
    AudioContext: RuntimeAudioContext as unknown as typeof AudioContext,
    setInterval: ((callback: () => void) => {
      const timerId = nextTimerId;
      nextTimerId += 1;
      intervalCallbacks.set(timerId, callback);
      return timerId;
    }) as typeof globalThis.setInterval,
    clearInterval: ((timerId: number) => {
      intervalCallbacks.delete(timerId);
    }) as typeof globalThis.clearInterval,
    totalVoiceStarts() {
      return contexts.reduce(
        (sum, context) =>
          sum + context.oscillatorStarts.length + context.bufferSourceStarts.length,
        0,
      );
    },
  };
}

class WebAudioFakeContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  sampleRate = 44_100;
  destination = new WebAudioFakeNode();
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
    return new WebAudioFakeGain();
  }

  createOscillator() {
    return new WebAudioFakeOscillator(this);
  }

  createBufferSource() {
    return new WebAudioFakeBufferSource(this);
  }

  createBiquadFilter() {
    return new WebAudioFakeBiquad();
  }

  createBuffer(_channels: number, length: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }

  createAnalyser() {
    return new WebAudioFakeAnalyser();
  }
}

class WebAudioFakeNode {
  connect<T>(node: T): T {
    return node;
  }
}

class WebAudioFakeGain extends WebAudioFakeNode {
  gain = {
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  };
}

class WebAudioFakeOscillator extends WebAudioFakeNode {
  type: OscillatorType = "sine";
  frequency = {
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  };

  constructor(private readonly context: WebAudioFakeContext) {
    super();
  }

  start(time: number) {
    this.context.oscillatorStarts.push(time);
  }

  stop() {
    return undefined;
  }
}

class WebAudioFakeBufferSource extends WebAudioFakeNode {
  buffer: unknown = null;

  constructor(private readonly context: WebAudioFakeContext) {
    super();
  }

  start(time: number) {
    this.context.bufferSourceStarts.push(time);
  }
}

class WebAudioFakeBiquad extends WebAudioFakeNode {
  type: BiquadFilterType = "lowpass";
  frequency = { value: 0 };
  Q = { value: 0 };
}

class WebAudioFakeAnalyser extends WebAudioFakeNode {
  fftSize = 2048;
  frequencyBinCount = 128;
  getByteFrequencyData(_array: Uint8Array) {
    return undefined;
  }
}

export function createToneFakeRuntime(): ToneRuntimePort & {
  transport: ReturnType<typeof createToneFakeTransport>;
  voices: Record<
    "kick" | "snare" | "hat" | "openHat",
    ReturnType<typeof createToneFakeVoice>
  >;
  startCount: number;
  totalVoiceTriggers(): number;
} {
  const transport = createToneFakeTransport();
  const voices = {
    kick: createToneFakeVoice(),
    snare: createToneFakeVoice(),
    hat: createToneFakeVoice(),
    openHat: createToneFakeVoice(),
  };
  let startCount = 0;
  let createdCount = 0;
  const orderedVoices = [voices.snare, voices.hat, voices.openHat];

  return {
    transport,
    voices,
    get startCount() {
      return startCount;
    },
    async start() {
      startCount += 1;
    },
    async loaded() {
      // no-op
    },
    getTransport: () => transport,
    createLaneVolume: () => ({
      node: {} as LaneVolumePort["node"],
      setLinearVolume: () => undefined,
      dispose: () => undefined,
    }),
    createKickSynth: () => voices.kick,
    createNoiseSynth: () => {
      const voice = orderedVoices[createdCount] ?? voices.openHat;
      createdCount += 1;
      return voice;
    },
    totalVoiceTriggers() {
      return Object.values(voices).reduce((sum, voice) => sum + voice.triggers, 0);
    },
  };
}

function createToneFakeTransport(): ToneTransportPort & {
  callback: ((time: number) => void) | null;
  started: boolean;
  run(time: number): void;
} {
  return {
    bpm: { value: 0 },
    swing: 0,
    swingSubdivision: undefined,
    callback: null,
    started: false,
    scheduleRepeat(callback) {
      this.callback = callback;
      return 1;
    },
    clear() {
      this.callback = null;
    },
    start() {
      this.started = true;
    },
    stop() {
      this.started = false;
    },
    run(time) {
      this.callback?.(time);
    },
  };
}

function createToneFakeVoice(): ToneVoicePort & {
  disposed: boolean;
  triggers: number;
} {
  return {
    disposed: false,
    triggers: 0,
    triggerAttackRelease() {
      this.triggers += 1;
    },
    start() {
      this.triggers += 1;
    },
    dispose() {
      this.disposed = true;
    },
  };
}
