import type * as Tone from "tone";
import type { BeatStyle } from "../lib/beatStyles";
import { getLaneVolumes } from "../lib/laneVolumes";
import type { InstrumentId } from "../lib/patterns";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import type { AudioEngine, ProducerTagSample } from "./audioEngine";
import { getStepEvents } from "./transport";
import { getMetronomeClickAccent } from "../lib/metronome";
import { createToneVoices, playVoice } from "./toneVoices";
import { getDefaultToneRuntime } from "./toneRuntime";

export interface LaneVolumePort {
  readonly node: Tone.Volume;
  setLinearVolume(volume: number): void;
  dispose(): void;
}

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
  start?: (time?: number, accent?: number) => void;
  triggerAttackRelease?: (...args: unknown[]) => unknown;
  dispose?: () => void;
}

export interface ToneRuntimePort {
  start(): Promise<void>;
  loaded(): Promise<void>;
  getTransport(): ToneTransportPort;
  createLaneVolume?(): LaneVolumePort;
  /**
   * Create a sample-player voice for `url`. Returns `null` if the player
   * cannot be constructed/loaded so the engine can fall back to a synth voice
   * without throwing or logging console errors.
   */
  createSamplePlayer?(url: string, destination?: LaneVolumePort): ToneVoicePort | null;
  createKickSynth(destination?: LaneVolumePort): ToneVoicePort;
  createBassSynth?(destination?: LaneVolumePort): ToneVoicePort;
  createMelodySynth?(destination?: LaneVolumePort): ToneVoicePort;
  createNoiseSynth(options?: unknown, destination?: LaneVolumePort): ToneVoicePort;
  onClickPlayed?: () => void;
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
  const voiceBundle = createToneVoices(runtime, options.sampleUrls ?? {});
  const { voices, setLaneVolumes, disposeLaneVolumes } = voiceBundle;
  let eventId: number | string | null = null;
  let stepIndex = 0;
  let visualStep: number | null = null;
  let tagSample: ProducerTagSample | null = null;
  let tagConfig: ProducerTagConfigInput | null = null;
  let metronomeEnabled = false;
  const clickVoice = runtime.createNoiseSynth(
    {
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    },
  );

  async function ready() {
    await runtime.start();
    await runtime.loaded();
  }

  function start(style: BeatStyle) {
    stop();
    setLaneVolumes(getLaneVolumes(style));
    stepIndex = 0;
    transport.bpm.value = style.bpm;
    transport.swing = Math.max(0, Math.min(0.5, style.swing));
    transport.swingSubdivision = "16n";
    eventId = transport.scheduleRepeat((time) => {
      scheduleStep(style, stepIndex, time);
      if (metronomeEnabled && stepIndex % 4 === 0) {
        playClickAt(time, getMetronomeClickAccent(stepIndex));
      }
      if (stepIndex === 0 && tagConfig?.enabled !== false && tagConfig?.trigger === "loop" && tagConfig.source === "recorded" && tagSample) {
        if (voices.openHat.start) {
          voices.openHat.start(time);
        } else {
          voices.openHat.triggerAttackRelease?.("8n", time, undefined, 0.85);
        }
      }
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
    clickVoice.dispose?.();
    disposeLaneVolumes();
  }

  function setProducerTagSample(sample: ProducerTagSample | null) {
    tagSample = sample;
  }

  function setProducerTagConfig(config: ProducerTagConfigInput | null) {
    tagConfig = config;
  }

  function playClick(accent = false) {
    playClickAt(undefined, accent);
  }

  function setMetronomeEnabled(enabled: boolean) {
    metronomeEnabled = enabled;
  }

  function playClickAt(time: number | undefined, accent: boolean) {
    clickVoice.triggerAttackRelease?.("32n", time, undefined, accent ? 0.55 : 0.35);
    runtime.onClickPlayed?.();
  }

  function playProducerTag(input: ProducerTagConfigInput | string) {
    const configInput = typeof input === "string" ? {} : input;
    if (typeof input !== "string" && input.enabled === false) return;
    if (configInput.source === "recorded" && tagSample) {
      // Tone.js has no raw PCM buffer API; fall through to the existing voice path
      if (voices.openHat.start) {
        voices.openHat.start();
        return;
      }
      voices.openHat.triggerAttackRelease?.("8n", undefined, undefined, 0.85);
      return;
    }
    if (voices.openHat.start) {
      voices.openHat.start();
      return;
    }
    voices.openHat.triggerAttackRelease?.("8n", undefined, undefined, 0.85);
  }

  function scheduleStep(style: BeatStyle, step: number, time: number) {
    for (const event of getStepEvents(style, step, time)) {
      playVoice(
        voices[event.instrument],
        event.instrument,
        event.time,
        event.accent,
        event.pitch,
      );
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
    setProducerTagSample,
    setProducerTagConfig,
    playClick,
    setMetronomeEnabled,
  };
}
