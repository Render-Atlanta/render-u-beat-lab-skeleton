import * as Tone from "tone";
import type {
  LaneVolumePort,
  ToneRuntimePort,
  ToneVoicePort,
} from "./toneSampleBeatEngine";

export function getDefaultToneRuntime(): ToneRuntimePort {
  return {
    start: Tone.start,
    loaded: Tone.loaded,
    getTransport: Tone.getTransport,
    createLaneVolume: () => {
      const node = new Tone.Volume(0).toDestination();
      return {
        node,
        setLinearVolume: (volume: number) => {
          node.volume.value = volume <= 0 ? -Infinity : 20 * Math.log10(volume);
        },
        dispose: () => {
          node.dispose();
        },
      };
    },
    createSamplePlayer: (url, destination) => createSamplePlayer(url, destination),
    createKickSynth: (destination) => {
      const synth = new Tone.MembraneSynth();
      if (destination) synth.connect(destination.node);
      else synth.toDestination();
      return toToneVoice(synth);
    },
    createBassSynth: (destination) => {
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.22, sustain: 0.08, release: 0.12 },
      });
      if (destination) synth.connect(destination.node);
      else synth.toDestination();
      return toToneVoice(synth);
    },
    createMelodySynth: (destination) => {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.003, decay: 0.16, sustain: 0.05, release: 0.08 },
      });
      if (destination) synth.connect(destination.node);
      else synth.toDestination();
      return toToneVoice(synth);
    },
    createNoiseSynth: (options, destination) => {
      const synth = new Tone.NoiseSynth(
        options as ConstructorParameters<typeof Tone.NoiseSynth>[0],
      );
      if (destination) synth.connect(destination.node);
      else synth.toDestination();
      return toToneVoice(synth);
    },
  };
}

function createSamplePlayer(
  url: string,
  destination?: LaneVolumePort,
): ToneVoicePort | null {
  try {
    let failed = false;
    const activePlayers = new Set<Tone.Player>();
    const source = new Tone.Player({
      url,
      onerror: () => {
        failed = true;
      },
    });
    if (destination) source.connect(destination.node);
    else source.toDestination();

    return {
      start: (time, accent = 1) => {
        if (failed) throw new Error(`tone sample failed to load: ${url}`);
        try {
          const player = new Tone.Player(source.buffer);
          if (destination) player.connect(destination.node);
          else player.toDestination();
          setPlayerGain(player, accent, time);
          player.start(time);
          activePlayers.add(player);
          disposeAfterPlayback(player, activePlayers, time);
        } catch (error) {
          failed = true;
          throw error;
        }
      },
      dispose: () => {
        source.dispose();
        for (const player of activePlayers) {
          player.dispose();
        }
        activePlayers.clear();
      },
    };
  } catch {
    return null;
  }
}

function disposeAfterPlayback(
  player: Tone.Player,
  activePlayers: Set<Tone.Player>,
  time: number | undefined,
) {
  const startDelaySeconds =
    time === undefined ? 0 : Math.max(0, time - Tone.now());
  const durationSeconds = player.buffer.duration || 1;
  globalThis.setTimeout(() => {
    player.dispose();
    activePlayers.delete(player);
  }, (startDelaySeconds + durationSeconds + 0.1) * 1000);
}

function toToneVoice(voice: { triggerAttackRelease: unknown; dispose: () => void }): ToneVoicePort {
  return {
    triggerAttackRelease: (...args) => {
      (
        voice.triggerAttackRelease as (...triggerArgs: unknown[]) => unknown
      )(...args);
    },
    dispose: () => voice.dispose(),
  };
}

function setPlayerGain(
  player: Tone.Player,
  accent: number,
  time: number | undefined,
) {
  const volume = player.volume as {
    value: number;
    setValueAtTime?: (value: number, time: number) => unknown;
  };
  const decibels = accent <= 0 ? -Infinity : 20 * Math.log10(accent);

  if (time !== undefined && volume.setValueAtTime) {
    volume.setValueAtTime(decibels, time);
    return;
  }

  volume.value = decibels;
}
