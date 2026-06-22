import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getKitSampleUrls } from "../audio/sampleKit";
import { loadKitFromSampleUrls, loadKitFromUrls } from "./loadKit.browser";

function mockKitFetch(): void {
  vi.stubGlobal("fetch", async (url: string) => {
    const publicPath = String(url).replace(/^\//, "");
    const bytes = readFileSync(join(process.cwd(), "public", publicPath));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => buffer,
    };
  });
}

describe("browser kit loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the default kit from the legacy base path", async () => {
    mockKitFetch();

    const kit = await loadKitFromUrls();

    expect(kit.kick.length).toBeGreaterThan(0);
    expect(kit.snare.length).toBeGreaterThan(0);
  });

  it("loads an explicit selected kit manifest", async () => {
    mockKitFetch();

    const kit = await loadKitFromSampleUrls(getKitSampleUrls(undefined, "punchy"));

    expect(kit.kick.length).toBeGreaterThan(0);
    expect(kit.clap.length).toBeGreaterThan(0);
  });
});
