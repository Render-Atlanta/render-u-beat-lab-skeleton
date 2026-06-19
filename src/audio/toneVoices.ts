import { INSTRUMENT_IDS, type InstrumentId } from "../lib/patterns";
import type { LaneVolumes } from "../lib/laneVolumes";
import type {
  LaneVolumePort,
  ToneRuntimePort,
  ToneSampleUrls,
  ToneVoicePort,
} from "./toneSampleBeatEngine";
import type { StepPitch } from "./transport";

// Accent used when a sample lane degrades to its synth fallback mid-playback.
// The per-step accent isn't threaded into the sample path (samples are
// pre-leveled), so a degraded lane plays at a steady, audible level.
const FALLBACK_ACCENT = 0.9;

export interface ToneVoiceBundle {
  voices: Record<InstrumentId, ToneVoicePort>;
  setLaneVolumes(volumes: LaneVolumes): void;
  disposeLaneVolumes(): void;
}

export function createToneVoices(
  runtime: ToneRuntimePort,
  sampleUrls: ToneSampleUrls,
): ToneVoiceBundle {
  const laneVolumes = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, createLaneVolume(runtime)]),
  ) as Record<InstrumentId, LaneVolumePort>;

  const voices = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [
      id,
      createVoice(runtime, id, sampleUrls[id], laneVolumes[id]),
    ]),
  ) as Record<InstrumentId, ToneVoicePort>;

  return {
    voices,
    setLaneVolumes: (volumes) => {
      for (const id of INSTRUMENT_IDS) {
        laneVolumes[id].setLinearVolume(volumes[id]);
      }
    },
    disposeLaneVolumes: () => {
      for (const id of INSTRUMENT_IDS) {
        laneVolumes[id].dispose();
      }
    },
  };
}

function createLaneVolume(runtime: ToneRuntimePort): LaneVolumePort {
  return (
    runtime.createLaneVolume?.() ?? {
      node: {} as LaneVolumePort["node"],
      setLinearVolume: () => undefined,
      dispose: () => undefined,
    }
  );
}

function createVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  sampleUrl: string | undefined,
  destination: LaneVolumePort,
): ToneVoicePort {
  if (instrument === "808" || instrument === "melody") {
    return createSynthVoice(runtime, instrument, destination);
  }

  if (sampleUrl && runtime.createSamplePlayer) {
    let player: ToneVoicePort | null = null;
    try {
      player = runtime.createSamplePlayer(sampleUrl, destination);
    } catch {
      player = null;
    }
    if (player) {
      return createSampleVoiceWithFallback(runtime, instrument, player, destination);
    }
  }

  return createSynthVoice(runtime, instrument, destination);
}

function createSynthVoice(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  destination: LaneVolumePort,
): ToneVoicePort {
  if (instrument === "808") {
    return runtime.createBassSynth?.(destination) ?? runtime.createKickSynth(destination);
  }

  if (instrument === "melody") {
    return runtime.createMelodySynth?.(destination) ?? runtime.createKickSynth(destination);
  }

  if (instrument === "kick") {
    return runtime.createKickSynth(destination);
  }

  const isLong = instrument === "openHat" || instrument === "clap";
  return runtime.createNoiseSynth(
    {
      envelope: {
        attack: 0.001,
        decay: isLong ? 0.18 : 0.045,
        sustain: 0,
        release: isLong ? 0.12 : 0.03,
      },
    },
    destination,
  );
}

function createSampleVoiceWithFallback(
  runtime: ToneRuntimePort,
  instrument: InstrumentId,
  player: ToneVoicePort,
  destination: LaneVolumePort,
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
          usePlayer = false;
        }
      }
      if (!synth) {
        synth = createSynthVoice(runtime, instrument, destination);
      }
      triggerSynthVoice(synth, instrument, time, FALLBACK_ACCENT, undefined);
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
  pitch?: StepPitch,
) {
  if (voice.start && instrument !== "808" && instrument !== "melody") {
    voice.start(time);
    return;
  }

  triggerSynthVoice(voice, instrument, time, accent, pitch);
}

function triggerSynthVoice(
  voice: ToneVoicePort,
  instrument: InstrumentId,
  time: number | undefined,
  accent: number,
  pitch?: StepPitch,
) {
  if (instrument === "808") {
    voice.triggerAttackRelease?.(pitch?.noteName ?? "A1", "8n", time, accent);
    return;
  }

  if (instrument === "melody") {
    voice.triggerAttackRelease?.(pitch?.noteName ?? "A3", "16n", time, accent);
    return;
  }

  if (instrument === "kick") {
    voice.triggerAttackRelease?.("C1", "8n", time, accent);
    return;
  }

  const isLong = instrument === "openHat" || instrument === "clap";
  voice.triggerAttackRelease?.(isLong ? "8n" : "32n", time, accent);
}
