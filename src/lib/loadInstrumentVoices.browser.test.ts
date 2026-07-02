import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeWav } from "./wav";
import { RENDER_SAMPLE_RATE } from "./styleRender";
import { noteNameToFrequency } from "./instrumentVoiceRender";
import {
  fetchVoiceNotes,
  loadInstrumentVoicesFromUrls,
} from "./loadInstrumentVoices.browser";
import { createDefaultLaneVoiceSelection } from "./laneVoiceSelection";
import { getLaneVoiceSamples } from "./instrumentVoices";

/**
 * Serve synthetic WAVs by URL so the test never depends on the gitignored VCSL
 * samples. `rates` overrides the sample rate for specific URLs; `missing` URLs
 * respond 404.
 */
function mockVoiceFetch(options?: {
  rates?: Record<string, number>;
  missing?: string[];
}): void {
  const rates = options?.rates ?? {};
  const missing = new Set(options?.missing ?? []);
  vi.stubGlobal("fetch", async (url: string) => {
    const key = String(url);
    if (missing.has(key)) {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    const bytes = encodeWav(
      new Float32Array([0.1, 0.2, 0.3]),
      rates[key] ?? RENDER_SAMPLE_RATE,
    );
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    return { ok: true, status: 200, arrayBuffer: async () => buffer };
  });
}

describe("fetchVoiceNotes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each note's WAV and tags it with the note's frequency", async () => {
    mockVoiceFetch();

    const voice = await fetchVoiceNotes({
      C4: "/instruments/piano/C4.wav",
      C5: "/instruments/piano/C5.wav",
    });

    expect(voice).not.toBeNull();
    expect(voice?.notes).toHaveLength(2);
    const frequencies = voice?.notes.map((n) => n.frequency);
    expect(frequencies).toContain(noteNameToFrequency("C4"));
    expect(frequencies).toContain(noteNameToFrequency("C5"));
  });

  it("degrades the whole voice to synth when a note WAV is missing", async () => {
    mockVoiceFetch({ missing: ["/instruments/piano/C5.wav"] });

    const voice = await fetchVoiceNotes({
      C4: "/instruments/piano/C4.wav",
      C5: "/instruments/piano/C5.wav",
    });

    expect(voice).toBeNull();
  });

  it("degrades the whole voice to synth when a WAV is off-rate", async () => {
    mockVoiceFetch({ rates: { "/instruments/piano/C4.wav": 44100 } });

    const voice = await fetchVoiceNotes({
      C4: "/instruments/piano/C4.wav",
      C5: "/instruments/piano/C5.wav",
    });

    expect(voice).toBeNull();
  });
});

describe("loadInstrumentVoicesFromUrls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the selected sampled voices", async () => {
    mockVoiceFetch();

    const selection = createDefaultLaneVoiceSelection();
    selection.melody = "piano";
    selection.bassGuitar = "electric";

    const voices = await loadInstrumentVoicesFromUrls(selection);

    expect(voices.melody?.notes.length).toBeGreaterThan(0);
    expect(voices.bassGuitar?.notes.length).toBeGreaterThan(0);
  });

  it("omits synth lanes without fetching (default selection)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const voices = await loadInstrumentVoicesFromUrls(
      createDefaultLaneVoiceSelection(),
    );

    // Default selection is all-synth, so every lane resolves to null samples.
    expect(getLaneVoiceSamples("melody", "synth")).toBeNull();
    expect(voices).toEqual({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
