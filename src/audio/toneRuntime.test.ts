import { describe, expect, it, vi } from "vitest";

vi.mock("tone", async (importOriginal) => {
  const tone = await importOriginal<typeof import("tone")>();
  class MockSampler {
    connect() {
      return this;
    }
    toDestination() {
      return this;
    }
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
  }
  return { ...tone, Sampler: MockSampler };
});

import { getDefaultToneRuntime } from "./toneRuntime";

describe("default tone runtime sampler voice", () => {
  it("exposes createSamplerVoice", () => {
    const runtime = getDefaultToneRuntime();
    expect(typeof runtime.createSamplerVoice).toBe("function");
  });

  it("returns a voice with triggerAttackRelease for a valid map", () => {
    const runtime = getDefaultToneRuntime();
    const voice = runtime.createSamplerVoice?.({ C3: "/instruments/piano/C3.wav" });
    expect(voice).not.toBeNull();
    expect(typeof voice?.triggerAttackRelease).toBe("function");
    voice?.dispose?.();
  });

  it("returns null for an empty sample map", () => {
    const runtime = getDefaultToneRuntime();
    expect(runtime.createSamplerVoice?.({})).toBeNull();
  });
});
