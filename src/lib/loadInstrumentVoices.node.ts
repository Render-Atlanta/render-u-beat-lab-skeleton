import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeWav } from "./wav";
import { RENDER_SAMPLE_RATE } from "./styleRender";
import {
  noteNameToFrequency,
  type DecodedInstrumentVoice,
  type DecodedInstrumentVoices,
} from "./instrumentVoiceRender";
import { VOICED_LANES, type LaneVoiceSelection } from "./laneVoiceSelection";
import { getLaneVoiceSamples, type NoteSampleMap } from "./instrumentVoices";

/**
 * Decode a note→URL sample map into a renderable voice (Node: scripts + tests).
 * Returns null if any referenced WAV is missing so the caller can fall back to
 * the synth voice — the offline equivalent of the live engine's degrade path.
 */
export function decodeVoiceNotes(
  samples: NoteSampleMap,
  publicDir: string,
): DecodedInstrumentVoice | null {
  const notes: DecodedInstrumentVoice["notes"] = [];
  for (const [noteName, url] of Object.entries(samples)) {
    const path = join(publicDir, url.replace(/^\//, ""));
    try {
      const decoded = decodeWav(readFileSync(path));
      if (decoded.sampleRate !== RENDER_SAMPLE_RATE) {
        // Wrong rate → degrade to the synth voice: the render rate is a hard
        // requirement of the sample-mix, so we can't use an off-rate WAV as-is.
        return null;
      }
      notes.push({ frequency: noteNameToFrequency(noteName), samples: decoded.samples });
    } catch {
      // Missing file, corrupt/unsupported WAV, or unparsable note name → degrade
      // to the synth voice rather than abort the whole export. (One try block
      // around the read+decode also avoids an existsSync/readFileSync TOCTOU.)
      return null;
    }
  }
  return notes.length > 0 ? { notes } : null;
}

/**
 * Load the sampled instrument voices selected in `selection` from disk. Synth
 * lanes and voices whose samples are absent are omitted, so the offline render
 * falls back to synthesis for them.
 */
export function loadInstrumentVoicesFromDisk(
  selection: LaneVoiceSelection,
  publicDir = join(process.cwd(), "public"),
): DecodedInstrumentVoices {
  const voices: DecodedInstrumentVoices = {};
  for (const lane of VOICED_LANES) {
    const samples = getLaneVoiceSamples(lane, selection[lane]);
    if (!samples) {
      continue;
    }
    const voice = decodeVoiceNotes(samples, publicDir);
    if (voice) {
      voices[lane] = voice;
    }
  }
  return voices;
}
