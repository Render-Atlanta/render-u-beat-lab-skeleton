import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "../lib/beatStyles";
import { decodeWav } from "../lib/wav";
import {
  DEFAULT_SAMPLE_KIT_ID,
  REQUIRED_LANES,
  SAMPLE_KIT_OPTIONS,
  getKitPieces,
  getKitSampleUrls,
  validateKit,
  type SampleKitId,
} from "./sampleKit";

const STYLE_IDS = Object.keys(BEAT_STYLES) as BeatStyleId[];
const PUBLIC_DIR = join(import.meta.dirname, "..", "..", "public");

function readSample(url: string): Buffer {
  // Manifest URLs are site-root absolute (/kit/x.wav); resolve under public/.
  return readFileSync(join(PUBLIC_DIR, url.replace(/^\//, "")));
}

describe("sample kit manifest", () => {
  it("offers three named kit choices", () => {
    expect(DEFAULT_SAMPLE_KIT_ID).toBe("classic");
    expect(SAMPLE_KIT_OPTIONS.map((kit) => kit.id)).toEqual([
      "classic",
      "punchy",
      "airy",
    ]);
  });

  it("covers every required lane for the default kit", () => {
    const urls = getKitSampleUrls();
    for (const lane of REQUIRED_LANES) {
      expect(urls[lane], `default kit missing ${lane}`).toBeTruthy();
    }
    expect(validateKit()).toEqual([]);
  });

  it.each(SAMPLE_KIT_OPTIONS)("resolves every required lane for kit $id", (kit) => {
    const urls = getKitSampleUrls(undefined, kit.id);
    for (const lane of REQUIRED_LANES) {
      const url = urls[lane];
      expect(url, `${kit.id}/${lane} URL`).toBeTruthy();
      expect(url?.startsWith(kit.id === "classic" ? "/kit/" : `/kit/${kit.id}/`)).toBe(true);
    }
    expect(validateKit(undefined, kit.id)).toEqual([]);
  });

  it.each(STYLE_IDS)("resolves all required lanes for style %s", (styleId) => {
    const urls = getKitSampleUrls(styleId);
    for (const lane of REQUIRED_LANES) {
      const url = urls[lane];
      expect(url, `${styleId}/${lane} URL`).toBeTruthy();
      expect(url?.startsWith("/kit/")).toBe(true);
    }
    expect(validateKit(styleId)).toEqual([]);
  });

  it("exposes a piece per lane with matching lane metadata", () => {
    const pieces = getKitPieces();
    for (const lane of REQUIRED_LANES) {
      expect(pieces[lane].lane).toBe(lane);
      expect(pieces[lane].url).toBe(getKitSampleUrls()[lane]);
    }
  });

  it("lists all six required lanes", () => {
    expect([...REQUIRED_LANES].sort()).toEqual(
      ["808", "clap", "hat", "kick", "openHat", "snare"].sort(),
    );
  });
});

describe("sample kit files on disk", () => {
  it.each(SAMPLE_KIT_OPTIONS)("maps every $id kit URL to a valid, non-empty WAV", (kit) => {
    const urls = getKitSampleUrls(undefined, kit.id as SampleKitId);
    for (const lane of REQUIRED_LANES) {
      const url = urls[lane] as string;
      const bytes = readSample(url);
      const decoded = decodeWav(bytes);
      expect(decoded.samples.length, `${lane} has no samples`).toBeGreaterThan(0);
      expect(decoded.sampleRate).toBeGreaterThanOrEqual(8_000);
      expect(decoded.sampleRate).toBeLessThanOrEqual(48_000);
      expect(decoded.durationMs).toBeGreaterThan(0);
      // Kept small for static hosting.
      expect(bytes.byteLength).toBeLessThan(25_000);
    }
  });
});
