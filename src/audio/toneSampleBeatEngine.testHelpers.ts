import type {
  LaneVolumePort,
  ToneEffectsBusPort,
  ToneRuntimePort,
  ToneTransportPort,
  ToneVoicePort,
} from "./toneSampleBeatEngine";

export function createFakeToneRuntime() {
  const transport = createFakeTransport();
  const voices = {
    kick: createFakeVoice(),
    snare: createFakeVoice(),
    hat: createFakeVoice(),
    openHat: createFakeVoice(),
    bassGuitar: createFakeVoice(),
  };
  const sampleUrls: string[] = [];
  let startCount = 0;
  let loadedCount = 0;
  const laneVolumeFactory = createFakeLaneVolumes();
  const effectsBuses: FakeToneEffectsBus[] = [];

  const runtime: ToneRuntimePort & {
    transport: ReturnType<typeof createFakeTransport>;
    voices: typeof voices;
    sampleUrls: string[];
    startCount: number;
    loadedCount: number;
    laneVolumePorts: Array<LaneVolumePort & { linearVolume: number }>;
    effectsBuses: FakeToneEffectsBus[];
  } = {
    transport,
    voices,
    sampleUrls,
    laneVolumePorts: laneVolumeFactory.ports,
    effectsBuses,
    get startCount() {
      return startCount;
    },
    get loadedCount() {
      return loadedCount;
    },
    async start() {
      startCount += 1;
    },
    async loaded() {
      loadedCount += 1;
    },
    getTransport: () => transport,
    createEffectsBus: () => {
      const bus = createFakeEffectsBus();
      effectsBuses.push(bus);
      return bus;
    },
    createLaneVolume: () => laneVolumeFactory.create(),
    createSamplePlayer: (url) => {
      sampleUrls.push(url);
      voices.kick.start = (time, accent) => {
        voices.kick.starts.push(time ?? 0);
        voices.kick.startCalls.push([time, accent]);
      };
      return voices.kick;
    },
    createKickSynth: () => voices.kick,
    createBassGuitarSynth: () => voices.bassGuitar,
    createNoiseSynth: () => {
      if (voices.snare.created === false) {
        voices.snare.created = true;
        return voices.snare;
      }

      if (voices.hat.created === false) {
        voices.hat.created = true;
        return voices.hat;
      }

      voices.openHat.created = true;
      return voices.openHat;
    },
  };

  return runtime;
}

type FakeToneEffectsBus = ToneEffectsBusPort & {
  disposed: boolean;
  mixEffects: Parameters<ToneEffectsBusPort["setMixEffects"]>[0] | null;
};

function createFakeEffectsBus(): FakeToneEffectsBus {
  return {
    input: {} as ToneEffectsBusPort["input"],
    disposed: false,
    mixEffects: null,
    setMixEffects(effects) {
      this.mixEffects = effects;
    },
    dispose() {
      this.disposed = true;
    },
  };
}

export function createFakeVoice(): ToneVoicePort & {
  created: boolean;
  disposed: boolean;
  plays: unknown[][];
  starts: number[];
  startCalls: unknown[][];
} {
  return {
    created: false,
    disposed: false,
    plays: [],
    starts: [],
    startCalls: [],
    triggerAttackRelease(...args) {
      this.plays.push(args);
    },
    dispose() {
      this.disposed = true;
    },
  };
}

function createFakeTransport(): ToneTransportPort & {
  callback: ((time: number) => void) | null;
  clearedIds: Array<number | string>;
  started: boolean;
  run(time: number): void;
} {
  return {
    bpm: { value: 0 },
    swing: 0,
    swingSubdivision: undefined,
    callback: null,
    clearedIds: [],
    started: false,
    scheduleRepeat(callback) {
      this.callback = callback;
      return 1;
    },
    clear(eventId) {
      this.clearedIds.push(eventId);
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

function createFakeLaneVolumes() {
  const ports: Array<LaneVolumePort & { linearVolume: number }> = [];

  return {
    create(): LaneVolumePort {
      const port = {
        node: {} as LaneVolumePort["node"],
        linearVolume: 1,
        setLinearVolume(volume: number) {
          port.linearVolume = volume;
        },
        dispose() {
          // no-op
        },
      };
      ports.push(port);
      return port;
    },
    ports,
  };
}
