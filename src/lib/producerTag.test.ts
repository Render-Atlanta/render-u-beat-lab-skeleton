import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRODUCER_TAG_EFFECTS,
  DEFAULT_PRODUCER_TAG_TEXT,
  createProducerTagPlaybackPlan,
  createProducerTagUtterance,
  getProducerTagAvailability,
  normalizeProducerTagConfig,
  type ProducerTagRuntime,
  type SpeechSynthesisUtteranceConstructor,
} from "./producerTag";

describe("producer tag helpers", () => {
  it("normalizes typed tag text, trigger state, and effect settings", () => {
    const config = normalizeProducerTagConfig({
      enabled: true,
      text: "  Render   U   exclusive  ",
      trigger: "intro",
      effects: {
        rate: 2,
        pitch: -1,
        volume: 0.42,
      },
    });

    expect(config).toEqual({
      enabled: true,
      text: "Render U exclusive",
      trigger: "intro",
      effects: {
        rate: 1.5,
        pitch: 0,
        volume: 0.42,
      },
    });
  });

  it("uses safe defaults for empty text and invalid effect numbers", () => {
    const config = normalizeProducerTagConfig({
      text: "   ",
      effects: {
        rate: Number.NaN,
        pitch: Number.POSITIVE_INFINITY,
        volume: undefined,
      },
    });

    expect(config.text).toBe(DEFAULT_PRODUCER_TAG_TEXT);
    expect(config.trigger).toBe("manual");
    expect(config.effects).toEqual(DEFAULT_PRODUCER_TAG_EFFECTS);
  });

  it("reports speech synthesis fallback reasons deterministically", () => {
    expect(getProducerTagAvailability({})).toEqual({
      status: "fallback",
      reason: "missing-speech-synthesis",
    });

    expect(
      getProducerTagAvailability({
        speechSynthesis: { cancel: vi.fn(), speak: vi.fn() },
      }),
    ).toEqual({
      status: "fallback",
      reason: "missing-utterance",
    });
  });

  it("returns a fallback playback plan when speech synthesis is unavailable", () => {
    const plan = createProducerTagPlaybackPlan(
      { text: "Render U made this", trigger: "manual" },
      {},
    );

    expect(plan.action).toBe("fallback");
    expect(plan.availability).toEqual({
      status: "fallback",
      reason: "missing-speech-synthesis",
    });
  });

  it("keeps disabled tags quiet even when speech synthesis is available", () => {
    const plan = createProducerTagPlaybackPlan(
      { enabled: false, text: "No drops right now" },
      createSpeechRuntime(),
    );

    expect(plan.action).toBe("disabled");
    expect(plan.config.enabled).toBe(false);
  });

  it("creates utterances with normalized text and effect settings", () => {
    const runtime = createSpeechRuntime();
    const plan = createProducerTagPlaybackPlan(
      {
        text: "  render   tag  ",
        effects: { rate: 0.6, pitch: 1.1, volume: 0.75 },
      },
      runtime,
    );

    expect(plan.action).toBe("speak");

    if (plan.action !== "speak" || !runtime.SpeechSynthesisUtterance) {
      throw new Error("Expected speech runtime to be available");
    }

    const utterance = createProducerTagUtterance(
      plan.config,
      runtime.SpeechSynthesisUtterance,
    );

    expect(utterance.text).toBe("render tag");
    expect(utterance.rate).toBe(0.6);
    expect(utterance.pitch).toBe(1.1);
    expect(utterance.volume).toBe(0.75);
  });
});

function createSpeechRuntime(): ProducerTagRuntime {
  class FakeUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    volume = 1;

    constructor(text = "") {
      this.text = text;
    }
  }

  return {
    speechSynthesis: { cancel: vi.fn(), speak: vi.fn() },
    SpeechSynthesisUtterance:
      FakeUtterance as unknown as SpeechSynthesisUtteranceConstructor,
  };
}
