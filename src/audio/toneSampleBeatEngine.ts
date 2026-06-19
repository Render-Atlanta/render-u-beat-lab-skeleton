import * as Tone from "tone";
import type { BeatStyle } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import type { AudioEngine } from "./audioEngine";
import { getStepEvents } from "./transport";
import { createToneVoices, playVoice } from "./toneVoices";

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
  /**
   * Create a sample-player voice for `url`. Returns `null` if the player
   * cannot be constructed/loaded so the engine can fall back to a synth voice
   * without throwing or logging console errors.
   */
  createSamplePlayer?(url: string): ToneVoicePort | null;
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
  let visualStep: number | null = null;

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
      visualStep = stepIndex;
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
    visualStep = null;
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
    getActiveStep: () => visualStep,
    getFrequencyData: () => false,
  };
}

function getDefaultToneRuntime(): ToneRuntimePort {
  return {
    start: Tone.start,
    loaded: Tone.loaded,
    getTransport: Tone.getTransport,
    createSamplePlayer: (url) => {
      try {
        // `onerror` swallows decode/network failures (Tone otherwise logs to
        // the console). The voice keeps a `failed` flag and *throws* from
        // start() once the sample is known-bad, so the engine wrapper degrades
        // the lane to its synth fallback instead of going silent.
        let failed = false;
        const player = new Tone.Player({
          url,
          onerror: () => {
            failed = true;
          },
        }).toDestination();
        return {
          start: (time) => {
            if (failed) {
              throw new Error(`tone sample failed to load: ${url}`);
            }
            try {
              player.start(time);
            } catch (error) {
              failed = true;
              throw error;
            }
          },
          dispose: () => {
            player.dispose();
          },
        };
      } catch {
        return null;
      }
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
