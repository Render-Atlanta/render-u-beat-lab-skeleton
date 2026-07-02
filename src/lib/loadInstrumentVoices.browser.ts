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
 * Fetch + decode a note→URL sample map into a renderable voice (browser).
 * The browser counterpart of the Node `decodeVoiceNotes`: fetching the bundled
 * WAV bytes and running them through `decodeWav` sidesteps `decodeAudioData`,
 * which would resample to the AudioContext rate — the sample-mix needs raw PCM
 * at RENDER_SAMPLE_RATE. Returns null if any referenced WAV is missing or
 * off-rate so the caller degrades that whole voice to the synth voice.
 */
export async function fetchVoiceNotes(
  samples: NoteSampleMap,
): Promise<DecodedInstrumentVoice | null> {
  const entries = Object.entries(samples);
  const notes: DecodedInstrumentVoice["notes"] = new Array(entries.length);
  try {
    await Promise.all(
      entries.map(async ([noteName, url], i) => {
        // Bound each fetch so a stalled host can't hang the export forever: a
        // timeout aborts → rejects → the catch below degrades this voice to
        // synth, matching how a missing/off-rate WAV is handled.
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status}`);
        }
        const decoded = decodeWav(await res.arrayBuffer());
        if (decoded.sampleRate !== RENDER_SAMPLE_RATE) {
          // Wrong rate → degrade to synth: the render rate is a hard requirement
          // of the sample-mix, so an off-rate WAV can't be used as-is.
          throw new Error(
            `Voice sample ${url} is ${decoded.sampleRate}Hz, expected ${RENDER_SAMPLE_RATE}Hz`,
          );
        }
        notes[i] = {
          frequency: noteNameToFrequency(noteName),
          samples: decoded.samples,
        };
      }),
    );
  } catch {
    // A missing file, off-rate WAV, or unparsable note name degrades the whole
    // voice to synth rather than exporting a half-rendered instrument — mirrors
    // the offline loader so browser and Node exports fall back identically.
    return null;
  }
  return notes.length > 0 ? { notes } : null;
}

/**
 * Fetch + decode the sampled instrument voices selected in `selection` (browser).
 * Synth lanes and voices whose samples are absent are omitted, so the export
 * falls back to synthesis for them — the browser counterpart of
 * `loadInstrumentVoicesFromDisk`.
 */
export async function loadInstrumentVoicesFromUrls(
  selection: LaneVoiceSelection,
): Promise<DecodedInstrumentVoices> {
  const voices: DecodedInstrumentVoices = {};
  await Promise.all(
    VOICED_LANES.map(async (lane) => {
      const samples = getLaneVoiceSamples(lane, selection[lane]);
      if (!samples) {
        return;
      }
      const voice = await fetchVoiceNotes(samples);
      if (voice) {
        voices[lane] = voice;
      }
    }),
  );
  return voices;
}
