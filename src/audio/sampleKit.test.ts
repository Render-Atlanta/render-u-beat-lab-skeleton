import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "../lib/beatStyles";
import { decodeWav } from "../lib/wav";
import {
  REQUIRED_LANES,
  getKitPieces,
  getKitSampleUrls,
  validateKit,
} from "./sampleKit";

const STYLE_IDS = Object.keys(BEAT_STYLES) as BeatStyleId[];
const PUBLIC_DIR = join(import.meta.dirname, "..", "..", "public");

function readSample(url: string): Buffer {
  // Manifest URLs are site-root absolute (/kit/x.wav); resolve under public/.
  return readFileSync(join(PUBLIC_DIR, url.replace(/^\//, "")));
}

describe("sample kit manifest", () => {
  it("covers every required lane for the default kit", () => {
    const urls = getKitSampleUrls();
    for (const lane of REQUIRED_LANES) {
      expect(urls[lane], `default kit missing ${lane}`).toBeTruthy();
    }
    expect(validateKit()).toEqual([]);
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
  it("maps every required lane URL to a valid, non-empty WAV", () => {
    const urls = getKitSampleUrls();
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
