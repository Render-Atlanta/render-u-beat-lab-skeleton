import * as Tone from "tone";
import type {
  LaneVolumePort,
  ToneEffectsBusPort,
  ToneRuntimePort,
  ToneVoicePort,
} from "./toneSampleBeatEngine";

export function getDefaultToneRuntime(): ToneRuntimePort {
  return {
    start: Tone.start,
    loaded: Tone.loaded,
    getTransport: Tone.getTransport,
    createEffectsBus,
    createLaneVolume: (destination) => {
      const node = new Tone.Volume(0);
      if (destination) node.connect(destination);
      else node.toDestination();
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
    createSamplerVoice: (samples, destination) =>
      createSamplerVoice(samples, destination),
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
    createBassGuitarSynth: (destination) => {
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        // Pluckier than the 808 sub: faster attack, shorter decay, less sustain.
        envelope: { attack: 0.006, decay: 0.18, sustain: 0.04, release: 0.09 },
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

function createEffectsBus(): ToneEffectsBusPort {
  const input = new Tone.Gain(1);
  const dry = new Tone.Gain(1).toDestination();
  const echo = new Tone.FeedbackDelay({ delayTime: 0.19, feedback: 0, wet: 0 });
  const space = new Tone.Reverb({ decay: 1.4, wet: 0 });
  echo.toDestination();
  space.toDestination();
  input.connect(dry);
  input.connect(echo);
  input.connect(space);

  return {
    input,
    setMixEffects: (effects) => {
      echo.wet.value = effects.echo * 0.42;
      echo.feedback.value = effects.echo * 0.22;
      space.wet.value = effects.space * 0.35;
    },
    dispose: () => {
      input.dispose();
      dry.dispose();
      echo.dispose();
      space.dispose();
    },
  };
}

function createSamplerVoice(
  samples: Record<string, string>,
  destination?: LaneVolumePort,
): ToneVoicePort | null {
  if (!samples || Object.keys(samples).length === 0) return null;
  try {
    const sampler = new Tone.Sampler({ urls: samples });
    if (destination) sampler.connect(destination.node);
    else sampler.toDestination();
    return {
      triggerAttackRelease: (...args) => {
        (sampler.triggerAttackRelease as (...a: unknown[]) => unknown)(...args);
      },
      dispose: () => sampler.dispose(),
    };
  } catch {
    return null;
  }
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
