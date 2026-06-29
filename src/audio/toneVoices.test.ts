import { describe, expect, it, vi } from "vitest";
import { createToneVoices } from "./toneVoices";
import type { ToneRuntimePort, ToneVoicePort } from "./toneSampleBeatEngine";

function stubVoice(): ToneVoicePort {
  return { triggerAttackRelease: vi.fn(), start: vi.fn(), dispose: vi.fn() };
}

function stubRuntime(overrides: Partial<ToneRuntimePort> = {}): ToneRuntimePort {
  return {
    start: vi.fn(), loaded: vi.fn(), getTransport: vi.fn() as never,
    createKickSynth: () => stubVoice(),
    createBassSynth: () => stubVoice(),
    createBassGuitarSynth: () => stubVoice(),
    createMelodySynth: () => stubVoice(),
    createNoiseSynth: () => stubVoice(),
    createLaneVolume: () => ({ node: {} as never, setLinearVolume: vi.fn(), dispose: vi.fn() }),
    ...overrides,
  };
}

describe("createToneVoices lane voice routing", () => {
  it("uses createSamplerVoice for a melody lane with a sample map", () => {
    const createSamplerVoice = vi.fn(() => stubVoice());
    const runtime = stubRuntime({ createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {
      melody: { C3: "/instruments/piano/C3.wav" },
    });
    expect(createSamplerVoice).toHaveBeenCalledTimes(1);
  });

  it("falls back to the melody synth when no sample map is given", () => {
    const createMelodySynth = vi.fn(() => stubVoice());
    const createSamplerVoice = vi.fn(() => stubVoice());
    const runtime = stubRuntime({ createMelodySynth, createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {});
    expect(createSamplerVoice).not.toHaveBeenCalled();
    expect(createMelodySynth).toHaveBeenCalled();
  });

  it("falls back to synth when the sampler cannot be built", () => {
    const createMelodySynth = vi.fn(() => stubVoice());
    const createSamplerVoice = vi.fn(() => null);
    const runtime = stubRuntime({ createMelodySynth, createSamplerVoice });
    createToneVoices(runtime, {}, undefined, {
      melody: { C3: "/instruments/piano/C3.wav" },
    });
    expect(createMelodySynth).toHaveBeenCalled();
  });
});
