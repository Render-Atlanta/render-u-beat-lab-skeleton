import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeWav } from "./wav";
import { INSTRUMENT_VOICES } from "./instrumentVoices";

const PUBLIC_DIR = join(import.meta.dirname, "..", "..", "public");
const sampled = INSTRUMENT_VOICES.flatMap((v) =>
  v.samples ? Object.entries(v.samples).map(([note, url]) => ({ id: v.id, note, url })) : [],
);

describe("instrument voice samples on disk", () => {
  it.each(sampled)("$id $note maps to a valid, small WAV", ({ url }) => {
    const path = join(PUBLIC_DIR, url.replace(/^\//, ""));
    expect(existsSync(path), `missing ${url}`).toBe(true);
    const bytes = readFileSync(path);
    const decoded = decodeWav(bytes);
    expect(decoded.samples.length).toBeGreaterThan(0);
    expect(decoded.sampleRate).toBe(22050);
    expect(bytes.byteLength).toBeLessThan(60_000);
  });
});
