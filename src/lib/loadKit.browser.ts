// src/lib/loadKit.browser.ts
import type { InstrumentId } from "./patterns";
import { decodeWav } from "./wav";
import type { DecodedKit } from "./styleRender";
import { RENDER_SAMPLE_RATE } from "./styleRender";

type SampledInstrumentId = Exclude<InstrumentId, "melody" | "bassGuitar">;
const LANES: SampledInstrumentId[] = ["kick", "snare", "hat", "openHat", "clap", "808"];
type BrowserKitSampleUrls = Record<SampledInstrumentId, string>;

/** Fetch + decode the bundled CC0 kit in the browser. */
export async function loadKitFromUrls(base = "/kit"): Promise<DecodedKit> {
  return loadKitFromSampleUrls(createKitUrlsFromBase(base));
}

/** Fetch + decode an explicit kit manifest in the browser. */
export async function loadKitFromSampleUrls(urls: BrowserKitSampleUrls): Promise<DecodedKit> {
  const kit = {} as DecodedKit;
  await Promise.all(
    LANES.map(async (lane) => {
      const res = await fetch(urls[lane]);
      if (!res.ok) throw new Error(`Failed to fetch ${lane}.wav: ${res.status}`);
      const decoded = decodeWav(await res.arrayBuffer());
      if (decoded.sampleRate !== RENDER_SAMPLE_RATE) {
        throw new Error(
          `Kit sample ${lane}.wav is ${decoded.sampleRate}Hz, expected ${RENDER_SAMPLE_RATE}Hz`,
        );
      }
      kit[lane] = decoded.samples;
    }),
  );
  return kit;
}

function createKitUrlsFromBase(base: string): BrowserKitSampleUrls {
  const normalizedBase = base.replace(/\/$/, "");
  return {
    kick: `${normalizedBase}/kick.wav`,
    snare: `${normalizedBase}/snare.wav`,
    hat: `${normalizedBase}/hat.wav`,
    openHat: `${normalizedBase}/openHat.wav`,
    clap: `${normalizedBase}/clap.wav`,
    "808": `${normalizedBase}/808.wav`,
  };
}
