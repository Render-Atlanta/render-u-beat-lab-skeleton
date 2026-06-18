import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import {
  createToneSampleBeatEngine,
  type ToneRuntimePort,
  type ToneTransportPort,
  type ToneVoicePort,
} from "./toneSampleBeatEngine";

describe("Tone.js sample beat engine", () => {
  it("starts Tone on ready and reports the tone-sample adapter kind", async () => {
    const runtime = createFakeToneRuntime();
    const engine = createToneSampleBeatEngine({ runtime });

    await engine.ready();

    expect(engine.kind).toBe("tone-sample");
    expect(runtime.startCount).toBe(1);
    expect(runtime.loadedCount).toBe(1);
  });

  it("schedules the selected style on Tone transport", () => {
    const runtime = createFakeToneRuntime();
    const engine = createToneSampleBeatEngine({ runtime });

    engine.start(BEAT_STYLES.trap);

    expect(runtime.transport.bpm.value).toBe(142);
    expect(runtime.transport.swing).toBe(0.04);
    expect(runtime.transport.swingSubdivision).toBe("16n");
    expect(runtime.transport.started).toBe(true);

    runtime.transport.run(1.25);

    expect(runtime.voices.kick.plays).toEqual([
      ["C1", "8n", 1.25, 1.12],
    ]);
    expect(runtime.voices.hat.plays).toEqual([
      ["32n", 1.25, 1.12],
    ]);
  });

  it("stops and disposes scheduled events and voices", () => {
    const runtime = createFakeToneRuntime();
    const engine = createToneSampleBeatEngine({ runtime });

    engine.start(BEAT_STYLES.pop);
    engine.stop();
    engine.dispose();

    expect(runtime.transport.clearedIds).toEqual([1]);
    expect(runtime.transport.started).toBe(false);
    expect(Object.values(runtime.voices).every((voice) => voice.disposed)).toBe(true);
  });

  it("uses sample players when sample URLs are provided", () => {
    const runtime = createFakeToneRuntime();
    const engine = createToneSampleBeatEngine({
      runtime,
      sampleUrls: {
        kick: "/samples/kick.wav",
      },
    });

    engine.start(BEAT_STYLES.trap);
    runtime.transport.run(0.5);

    expect(runtime.sampleUrls).toEqual(["/samples/kick.wav"]);
    expect(runtime.voices.kick.starts).toEqual([0.5]);
  });

  it("falls back to the synth voice when a sample player fails to load", () => {
    const runtime = createFakeToneRuntime();
    // Simulate a failed/missing sample: the player returns null instead of a
    // voice, so the engine must degrade to createKickSynth without throwing.
    runtime.createSamplePlayer = (url) => {
      runtime.sampleUrls.push(url);
      return null;
    };

    const engine = createToneSampleBeatEngine({
      runtime,
      sampleUrls: { kick: "/missing/kick.wav" },
    });

    expect(() => {
      engine.start(BEAT_STYLES.trap);
      runtime.transport.run(0.5);
    }).not.toThrow();

    expect(runtime.sampleUrls).toEqual(["/missing/kick.wav"]);
    // The synth kick voice fired (triggerAttackRelease), not a sample start.
    expect(runtime.voices.kick.plays.length).toBeGreaterThan(0);
    expect(runtime.voices.kick.starts).toEqual([]);
  });

  it("falls back to the synth voice when constructing a sample player throws", () => {
    const runtime = createFakeToneRuntime();
    runtime.createSamplePlayer = () => {
      throw new Error("decode failure");
    };

    const engine = createToneSampleBeatEngine({
      runtime,
      sampleUrls: { kick: "/broken/kick.wav" },
    });

    expect(() => {
      engine.start(BEAT_STYLES.trap);
      runtime.transport.run(0.5);
    }).not.toThrow();

    expect(runtime.voices.kick.plays.length).toBeGreaterThan(0);
  });

  it("falls back to the synth voice when a sample fails to load after construction", () => {
    const runtime = createFakeToneRuntime();
    const kickSynth = createFakeVoice();
    // The player constructs fine but start() throws — Tone's `onerror` path for
    // a 404 / undecodable file. The lane must degrade to the synth voice rather
    // than going silent on every scheduled hit.
    runtime.createSamplePlayer = (url) => {
      runtime.sampleUrls.push(url);
      return {
        start: () => {
          throw new Error("load failed after construction");
        },
        dispose: () => {},
      };
    };
    runtime.createKickSynth = () => kickSynth;

    const engine = createToneSampleBeatEngine({
      runtime,
      sampleUrls: { kick: "/late-fail/kick.wav" },
    });

    expect(() => {
      engine.start(BEAT_STYLES.trap);
      runtime.transport.run(0.5);
    }).not.toThrow();

    expect(runtime.sampleUrls).toEqual(["/late-fail/kick.wav"]);
    // The synth kick voice fired after the player threw — not silence.
    expect(kickSynth.plays.length).toBeGreaterThan(0);
  });
});

function createFakeToneRuntime() {
  const transport = createFakeTransport();
  const voices = {
    kick: createFakeVoice(),
    snare: createFakeVoice(),
    hat: createFakeVoice(),
    openHat: createFakeVoice(),
  };
  const sampleUrls: string[] = [];
  let startCount = 0;
  let loadedCount = 0;

  const runtime: ToneRuntimePort & {
    transport: ReturnType<typeof createFakeTransport>;
    voices: typeof voices;
    sampleUrls: string[];
    startCount: number;
    loadedCount: number;
  } = {
    transport,
    voices,
    sampleUrls,
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
    createSamplePlayer: (url) => {
      sampleUrls.push(url);
      voices.kick.start = (time) => {
        voices.kick.starts.push(time ?? 0);
      };
      return voices.kick;
    },
    createKickSynth: () => voices.kick,
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

function createFakeVoice(): ToneVoicePort & {
  created: boolean;
  disposed: boolean;
  plays: unknown[][];
  starts: number[];
} {
  return {
    created: false,
    disposed: false,
    plays: [],
    starts: [],
    triggerAttackRelease(...args) {
      this.plays.push(args);
    },
    dispose() {
      this.disposed = true;
    },
  };
}
