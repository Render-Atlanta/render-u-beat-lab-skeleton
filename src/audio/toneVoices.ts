import type { InstrumentId } from "../lib/patterns";
import type {
  ToneRuntimePort,
  ToneSampleUrls,
  ToneVoicePort,
} from "./toneSampleBeatEngine";

// Accent used when a sample lane degrades to its synth fallback mid-playback.
// The per-step accent isn't threaded into the sample path (samples are
// pre-leveled), so a degraded lane plays at a steady, audible level.
const FALLBACK_ACCENT = 0.9;

export function createToneVoices(
  runtime: ToneRuntimePort,
  sampleUrls: ToneSampleUrls,
): Record<InstrumentId, ToneVoicePort> {
  return {
    kick: createVoice(runtime, "kick", sampleUrls.kick),
    snare: createVoice(runtime, "snare", sampleUrls.snare),
    hat: createVoice(runtime, "hat", sampleUrls.hat),
    openHat: createVoice(runtime, "openHat", sampleUrls.openHat),
    clap: createVoice(runtime, "clap", sampleUrls.clap),
    "808": createVoice(runtime, "808", sampleUrls["808"]),
  };
}

function createVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  sampleUrl: string | undefined,
): ToneVoicePort {
  if (sampleUrl && runtime.createSamplePlayer) {
    // A failed/missing sample returns null (or throws) at construction; either
    // way we fall through to the synth voice so playback degrades gracefully.
    let player: ToneVoicePort | null = null;
    try {
      player = runtime.createSamplePlayer(sampleUrl);
    } catch {
      player = null;
    }
    if (player) {
      return createSampleVoiceWithFallback(runtime, instrument, player);
    }
  }

  return createSynthVoice(runtime, instrument);
}

function createSynthVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
): ToneVoicePort {
  if (instrument === "kick" || instrument === "808") {
    return runtime.createKickSynth();
  }

  const isLong = instrument === "openHat" || instrument === "clap";
  return runtime.createNoiseSynth({
    envelope: {
      attack: 0.001,
      decay: isLong ? 0.18 : 0.045,
      sustain: 0,
      release: isLong ? 0.12 : 0.03,
    },
  });
}

/**
 * Wrap a sample player so a load/decode failure that surfaces *after*
 * construction (e.g. a 404 or undecodable file reported via Tone's `onerror`,
 * which makes `player.start` throw) degrades the lane to its synth voice
 * instead of going silent. The synth is created lazily and only the first time
 * the player fails, after which the lane stays on the synth.
 */
function createSampleVoiceWithFallback(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  player: ToneVoicePort,
): ToneVoicePort {
  let synth: ToneVoicePort | null = null;
  let usePlayer = true;

  return {
    start: (time) => {
      if (usePlayer) {
        try {
          player.start?.(time);
          return;
        } catch {
          // Sample is unusable — switch this lane to the synth permanently.
          usePlayer = false;
        }
      }
      if (!synth) {
        synth = createSynthVoice(runtime, instrument);
      }
      triggerSynthVoice(synth, instrument, time, FALLBACK_ACCENT);
    },
    dispose: () => {
      player.dispose?.();
      synth?.dispose?.();
    },
  };
}

export function playVoice(
  voice: ToneVoicePort,
  instrument: InstrumentId,
  time: number,
  accent: number,
) {
  if (voice.start) {
    voice.start(time);
    return;
  }

  triggerSynthVoice(voice, instrument, time, accent);
}

function triggerSynthVoice(
  voice: ToneVoicePort,
  instrument: InstrumentId,
  time: number | undefined,
  accent: number,
) {
  if (instrument === "kick" || instrument === "808") {
    voice.triggerAttackRelease?.(instrument === "808" ? "A0" : "C1", "8n", time, accent);
    return;
  }

  const isLong = instrument === "openHat" || instrument === "clap";
  voice.triggerAttackRelease?.(isLong ? "8n" : "32n", time, accent);
}
