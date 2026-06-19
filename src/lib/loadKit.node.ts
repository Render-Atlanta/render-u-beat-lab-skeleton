import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { InstrumentId } from "./patterns";
import { decodeWav } from "./wav";
import type { DecodedKit } from "./styleRender";
import { RENDER_SAMPLE_RATE } from "./styleRender";

type SampledInstrumentId = Exclude<InstrumentId, "melody">;
const LANES: SampledInstrumentId[] = ["kick", "snare", "hat", "openHat", "clap", "808"];

/** Load + decode the bundled CC0 kit from disk (Node: scripts + tests). */
export function loadKitFromDisk(
  kitDir = join(process.cwd(), "public", "kit"),
): DecodedKit {
  const kit = {} as DecodedKit;
  for (const lane of LANES) {
    const decoded = decodeWav(readFileSync(join(kitDir, `${lane}.wav`)));
    if (decoded.sampleRate !== RENDER_SAMPLE_RATE) {
      throw new Error(
        `Kit sample ${lane}.wav is ${decoded.sampleRate}Hz, expected ${RENDER_SAMPLE_RATE}Hz`,
      );
    }
    kit[lane] = decoded.samples;
  }
  return kit;
}
