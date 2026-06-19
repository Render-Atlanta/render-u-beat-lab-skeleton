import type { BeatStyle } from "../lib/beatStyles";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import {
  createWebAudioBeatEngine,
  type WebAudioBeatEngineRuntime,
} from "./webAudioBeatEngine";
import {
  createToneSampleBeatEngine,
  type ToneRuntimePort,
  type ToneSampleUrls,
} from "./toneSampleBeatEngine";

export type AudioEngineKind = "web-audio" | "tone-sample";

export interface AudioEngine {
  readonly kind: AudioEngineKind;
  ready(): Promise<void>;
  start(style: BeatStyle): void;
  stop(): void;
  dispose(): void | Promise<void>;
  playProducerTag(input: ProducerTagConfigInput | string): void;
  /** The step index that should currently be highlighted, or null when idle. */
  getActiveStep(): number | null;
  /**
   * Fill `target` with the current frequency spectrum (0..255 per bin).
   * Returns false when no analyser is available (idle/unsupported engine).
   */
  getFrequencyData(target: Uint8Array): boolean;
}

export interface AudioEngineOptions {
  kind?: AudioEngineKind;
  runtime?: WebAudioBeatEngineRuntime;
  toneRuntime?: ToneRuntimePort;
  toneSampleUrls?: ToneSampleUrls;
}

export function createAudioEngine(options: AudioEngineOptions = {}): AudioEngine {
  switch (options.kind ?? "web-audio") {
    case "web-audio":
      return createWebAudioBeatEngine(options.runtime);
    case "tone-sample":
      return createToneSampleBeatEngine({
        runtime: options.toneRuntime,
        sampleUrls: options.toneSampleUrls,
      });
  }
}
