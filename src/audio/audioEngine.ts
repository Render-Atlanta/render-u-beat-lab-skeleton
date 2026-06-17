import type { BeatStyle } from "../lib/beatStyles";
import type { ProducerTagConfigInput } from "../lib/producerTag";
import {
  createWebAudioBeatEngine,
  type WebAudioBeatEngineRuntime,
} from "./webAudioBeatEngine";

export type AudioEngineKind = "web-audio";

export interface AudioEngine {
  readonly kind: AudioEngineKind;
  ready(): Promise<void>;
  start(style: BeatStyle): void;
  stop(): void;
  dispose(): void | Promise<void>;
  playProducerTag(input: ProducerTagConfigInput | string): void;
}

export interface AudioEngineOptions {
  kind?: AudioEngineKind;
  runtime?: WebAudioBeatEngineRuntime;
}

export function createAudioEngine(options: AudioEngineOptions = {}): AudioEngine {
  switch (options.kind ?? "web-audio") {
    case "web-audio":
      return createWebAudioBeatEngine(options.runtime);
  }
}
