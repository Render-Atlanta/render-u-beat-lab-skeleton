export type ProducerTagTrigger = "manual" | "intro" | "loop";

export type ProducerTagSource = "text" | "recorded";

export type ProducerTagText = string & { readonly __producerTagText: unique symbol };

export interface ProducerTagEffects {
  rate: number;
  pitch: number;
  volume: number;
}

export interface ProducerTagConfig {
  enabled: boolean;
  text: ProducerTagText;
  trigger: ProducerTagTrigger;
  effects: ProducerTagEffects;
  source: ProducerTagSource;
}

export interface ProducerTagConfigInput {
  enabled?: boolean;
  text?: string;
  trigger?: ProducerTagTrigger;
  effects?: Partial<ProducerTagEffects>;
  source?: ProducerTagSource;
}

export type ProducerTagUnavailableReason =
  | "missing-speech-synthesis"
  | "missing-utterance";

export type ProducerTagAvailability =
  | { status: "available" }
  | { status: "fallback"; reason: ProducerTagUnavailableReason };

export type ProducerTagPlaybackPlan =
  | {
      action: "disabled";
      config: ProducerTagConfig;
      availability: ProducerTagAvailability;
    }
  | {
      action: "speak";
      config: ProducerTagConfig;
      availability: { status: "available" };
    }
  | {
      action: "fallback";
      config: ProducerTagConfig;
      availability: Extract<ProducerTagAvailability, { status: "fallback" }>;
    };

export interface ProducerTagRuntime {
  speechSynthesis?: Pick<SpeechSynthesis, "cancel" | "speak"> | null;
  SpeechSynthesisUtterance?: SpeechSynthesisUtteranceConstructor | null;
}

export interface SpeechSynthesisUtteranceConstructor {
  new (text?: string): SpeechSynthesisUtterance;
}

export const DEFAULT_PRODUCER_TAG_TEXT = "Render U made this";
export const DEFAULT_PRODUCER_TAG_EFFECTS: ProducerTagEffects = {
  rate: 0.86,
  pitch: 0.72,
  volume: 0.9,
};

export function normalizeProducerTagConfig(
  input: ProducerTagConfigInput = {},
): ProducerTagConfig {
  return {
    enabled: input.enabled ?? true,
    text: createProducerTagText(input.text),
    trigger: input.trigger === "intro" || input.trigger === "loop" ? input.trigger : "manual",
    effects: normalizeProducerTagEffects(input.effects),
    source: input.source === "recorded" ? "recorded" : "text",
  };
}

export function createProducerTagText(text = DEFAULT_PRODUCER_TAG_TEXT): ProducerTagText {
  const normalized = text.trim().replace(/\s+/g, " ");
  return (normalized || DEFAULT_PRODUCER_TAG_TEXT) as ProducerTagText;
}

export function normalizeProducerTagEffects(
  effects: Partial<ProducerTagEffects> = {},
): ProducerTagEffects {
  return {
    rate: clampNumber(effects.rate, 0.5, 1.5, DEFAULT_PRODUCER_TAG_EFFECTS.rate),
    pitch: clampNumber(effects.pitch, 0, 2, DEFAULT_PRODUCER_TAG_EFFECTS.pitch),
    volume: clampNumber(effects.volume, 0, 1, DEFAULT_PRODUCER_TAG_EFFECTS.volume),
  };
}

export function getProducerTagAvailability(
  runtime: ProducerTagRuntime = getBrowserProducerTagRuntime(),
): ProducerTagAvailability {
  if (!runtime.speechSynthesis) {
    return { status: "fallback", reason: "missing-speech-synthesis" };
  }

  if (!runtime.SpeechSynthesisUtterance) {
    return { status: "fallback", reason: "missing-utterance" };
  }

  return { status: "available" };
}

export function createProducerTagPlaybackPlan(
  input: ProducerTagConfigInput = {},
  runtime: ProducerTagRuntime = getBrowserProducerTagRuntime(),
): ProducerTagPlaybackPlan {
  const config = normalizeProducerTagConfig(input);
  const availability = getProducerTagAvailability(runtime);

  if (!config.enabled) {
    return { action: "disabled", config, availability };
  }

  if (availability.status === "fallback") {
    return { action: "fallback", config, availability };
  }

  return { action: "speak", config, availability };
}

export function createProducerTagUtterance(
  config: ProducerTagConfig,
  Utterance: SpeechSynthesisUtteranceConstructor,
): SpeechSynthesisUtterance {
  const utterance = new Utterance(config.text);
  utterance.rate = config.effects.rate;
  utterance.pitch = config.effects.pitch;
  utterance.volume = config.effects.volume;
  return utterance;
}

export function getBrowserProducerTagRuntime(): ProducerTagRuntime {
  const host = globalThis as typeof globalThis & ProducerTagRuntime;
  return {
    speechSynthesis: host.speechSynthesis ?? null,
    SpeechSynthesisUtterance: host.SpeechSynthesisUtterance ?? null,
  };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}
