import * as Tone from "tone";
import type { BeatStyle } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import type { AudioEngine } from "./audioEngine";
import { getStepEvents } from "./transport";

export interface ToneTransportPort {
  bpm: { value: number };
  swing: number;
  swingSubdivision?: string;
  scheduleRepeat(
    callback: (time: number) => void,
    interval: string,
  ): number | string;
  clear(eventId: number | string): void;
  start(time?: number | string): void;
  stop(time?: number | string): void;
}

export interface ToneVoicePort {
  start?: (time?: number) => void;
  triggerAttackRelease?: (...args: unknown[]) => unknown;
  dispose?: () => void;
}

export interface ToneRuntimePort {
  start(): Promise<void>;
  loaded(): Promise<void>;
  getTransport(): ToneTransportPort;
  createSamplePlayer?(url: string): ToneVoicePort;
  createKickSynth(): ToneVoicePort;
  createNoiseSynth(options?: unknown): ToneVoicePort;
}

export type ToneSampleUrls = Partial<Record<InstrumentId, string>>;

export interface ToneSampleBeatEngineOptions {
  runtime?: ToneRuntimePort;
  sampleUrls?: ToneSampleUrls;
}

export function createToneSampleBeatEngine(
  options: ToneSampleBeatEngineOptions = {},
): AudioEngine {
  const runtime = options.runtime ?? getDefaultToneRuntime();
  const transport = runtime.getTransport();
  const voices = createToneVoices(runtime, options.sampleUrls ?? {});
  let eventId: number | string | null = null;
  let stepIndex = 0;

  async function ready() {
    await runtime.start();
    await runtime.loaded();
  }

  function start(style: BeatStyle) {
    stop();
    stepIndex = 0;
    transport.bpm.value = style.bpm;
    transport.swing = Math.max(0, Math.min(0.5, style.swing));
    transport.swingSubdivision = "16n";
    eventId = transport.scheduleRepeat((time) => {
      scheduleStep(style, stepIndex, time);
      stepIndex = (stepIndex + 1) % 16;
    }, "16n");
    transport.start();
  }

  function stop() {
    if (eventId !== null) {
      transport.clear(eventId);
      eventId = null;
    }
    transport.stop();
  }

  function dispose() {
    stop();
    for (const voice of Object.values(voices)) {
      voice.dispose?.();
    }
  }

  function playProducerTag(_input: ProducerTagConfigInput | string) {
    // Sample-player voices expose `start`; synth voices expose
    // `triggerAttackRelease`. Prefer the sample path so the tag is audible
    // once a kit configures an openHat sample.
    if (voices.openHat.start) {
      voices.openHat.start();
      return;
    }
    voices.openHat.triggerAttackRelease?.("8n", undefined, undefined, 0.85);
  }

  function scheduleStep(style: BeatStyle, step: number, time: number) {
    for (const event of getStepEvents(style, step, time)) {
      playVoice(voices[event.instrument], event.instrument, event.time, event.accent);
    }
  }

  return {
    kind: "tone-sample",
    ready,
    start,
    stop,
    dispose,
    playProducerTag,
  };
}

function createToneVoices(
  runtime: ToneRuntimePort,
  sampleUrls: ToneSampleUrls,
): Record<InstrumentId, ToneVoicePort> {
  return {
    kick: createVoice(runtime, "kick", sampleUrls.kick),
    snare: createVoice(runtime, "snare", sampleUrls.snare),
    hat: createVoice(runtime, "hat", sampleUrls.hat),
    openHat: createVoice(runtime, "openHat", sampleUrls.openHat),
  };
}

function createVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  sampleUrl: string | undefined,
): ToneVoicePort {
  if (sampleUrl && runtime.createSamplePlayer) {
    return runtime.createSamplePlayer(sampleUrl);
  }

  if (instrument === "kick") {
    return runtime.createKickSynth();
  }

  return runtime.createNoiseSynth({
    envelope: {
      attack: 0.001,
      decay: instrument === "openHat" ? 0.18 : 0.045,
      sustain: 0,
      release: instrument === "openHat" ? 0.12 : 0.03,
    },
  });
}

function playVoice(
  voice: ToneVoicePort,
  instrument: InstrumentId,
  time: number,
  accent: number,
) {
  if (voice.start) {
    voice.start(time);
    return;
  }

  if (instrument === "kick") {
    voice.triggerAttackRelease?.("C1", "8n", time, accent);
    return;
  }

  voice.triggerAttackRelease?.(instrument === "openHat" ? "8n" : "32n", time, accent);
}

function getDefaultToneRuntime(): ToneRuntimePort {
  return {
    start: Tone.start,
    loaded: Tone.loaded,
    getTransport: Tone.getTransport,
    createSamplePlayer: (url) => {
      const player = new Tone.Player(url).toDestination();
      return {
        start: (time) => player.start(time),
        dispose: () => {
          player.dispose();
        },
      };
    },
    createKickSynth: () => {
      const synth = new Tone.MembraneSynth().toDestination();
      return {
        triggerAttackRelease: (...args) => {
          (
            synth.triggerAttackRelease as unknown as (
              ...triggerArgs: unknown[]
            ) => unknown
          )(...args);
        },
        dispose: () => {
          synth.dispose();
        },
      };
    },
    createNoiseSynth: (options) => {
      const synth = new Tone.NoiseSynth(
        options as ConstructorParameters<typeof Tone.NoiseSynth>[0],
      ).toDestination();
      return {
        triggerAttackRelease: (...args) => {
          (
            synth.triggerAttackRelease as unknown as (
              ...triggerArgs: unknown[]
            ) => unknown
          )(...args);
        },
        dispose: () => {
          synth.dispose();
        },
      };
    },
  };
}
