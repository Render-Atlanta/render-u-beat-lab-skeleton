// src/lib/loadKit.browser.ts
import type { InstrumentId } from "./patterns";
import { decodeWav } from "./wav";
import type { DecodedKit } from "./styleRender";

type SampledInstrumentId = Exclude<InstrumentId, "melody" | "bassGuitar">;
const LANES: SampledInstrumentId[] = ["kick", "snare", "hat", "openHat", "clap", "808"];

/** Fetch + decode the bundled CC0 kit in the browser. */
export async function loadKitFromUrls(base = "/kit"): Promise<DecodedKit> {
  const kit = {} as DecodedKit;
  await Promise.all(
    LANES.map(async (lane) => {
      const res = await fetch(`${base}/${lane}.wav`);
      if (!res.ok) throw new Error(`Failed to fetch ${lane}.wav: ${res.status}`);
      kit[lane] = decodeWav(await res.arrayBuffer()).samples;
    }),
  );
  return kit;
}
