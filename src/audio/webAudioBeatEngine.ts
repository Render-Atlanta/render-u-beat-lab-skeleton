import type { BeatStyle } from "../lib/beatStyles";
import { getLaneVolumes } from "../lib/laneVolumes";
import { INSTRUMENT_IDS, type InstrumentId } from "../lib/patterns";
import {
  createProducerTagPlaybackPlan,
  createProducerTagUtterance,
  getBrowserProducerTagRuntime,
  type ProducerTagConfigInput,
} from "../lib/producerTag";
import type { AudioEngine, ProducerTagSample } from "./audioEngine";
import {
  getActiveStep,
  getNextStepIndex,
  getStepEvents,
  getSwingStepDurationSeconds,
  SCHEDULE_AHEAD_SECONDS,
  SCHEDULER_TICK_MS,
  START_DELAY_SECONDS,
  type StepPitch,
  type StepQueueEntry,
} from "./transport";
import { getMetronomeClickAccent } from "../lib/metronome";

type DrumVoice = (time: number, accent?: number, pitch?: StepPitch) => void;

export interface WebAudioBeatEngineRuntime {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
  onClickPlayed?: () => void;
}

export function createWebAudioBeatEngine(
  runtime: WebAudioBeatEngineRuntime = getDefaultWebAudioRuntime(),
): AudioEngine {
  const AudioContextClass = runtime.AudioContext ?? runtime.webkitAudioContext;
  const setRuntimeInterval = runtime.setInterval ?? globalThis.setInterval;
  const clearRuntimeInterval = runtime.clearInterval ?? globalThis.clearInterval;

  if (!AudioContextClass) {
    throw new Error("This browser does not support the Web Audio API.");
  }

  const context = new AudioContextClass();
  let timer: ReturnType<typeof setRuntimeInterval> | null = null;
  let nextStepTime = 0;
  let step = 0;
  let stepQueue: StepQueueEntry[] = [];
  let tagSample: ProducerTagSample | null = null;
  let tagConfig: ProducerTagConfigInput | null = null;
  let metronomeEnabled = false;

  const master = context.createGain();
  master.gain.value = 0.65;
  const metronomeGain = context.createGain();
  metronomeGain.gain.value = 0;
  metronomeGain.connect(master);
  const laneBuses = Object.fromEntries(
    INSTRUMENT_IDS.map((id) => {
      const bus = context.createGain();
      bus.gain.value = 1;
      bus.connect(master);
      return [id, bus] as const;
    }),
  ) as Record<InstrumentId, GainNode>;
  const analyser = context.createAnalyser?.() ?? null;
  if (analyser) {
    analyser.fftSize = 256;
    master.connect(analyser);
    analyser.connect(context.destination);
  } else {
    master.connect(context.destination);
  }

  const voices: Record<InstrumentId, DrumVoice> = {
    kick: playKick,
    snare: playSnare,
    hat: playHat,
    openHat: playOpenHat,
    clap: playClap,
    "808": play808,
    melody: playMelody,
  };

  async function ready() {
    if (context.state !== "running") {
      await context.resume();
    }
  }

  function start(style: BeatStyle) {
    stop();
    applyLaneVolumes(style);
    step = 0;
    nextStepTime = context.currentTime + START_DELAY_SECONDS;
    stepQueue = [];

    timer = setRuntimeInterval(() => {
      while (nextStepTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
        scheduleStep(style, step, nextStepTime);
        if (metronomeEnabled && step % 4 === 0) {
          playClickAt(nextStepTime, getMetronomeClickAccent(step));
        }
        if (step === 0 && tagConfig?.enabled !== false && tagConfig?.trigger === "loop" && tagConfig.source === "recorded" && tagSample) {
          playTagSample(nextStepTime);
        }
        stepQueue.push({ stepIndex: step, time: nextStepTime });
        if (stepQueue.length > 64) {
          stepQueue = stepQueue.slice(-32);
        }
        nextStepTime += getSwingStepDurationSeconds(style.bpm, style.swing, step);
        step = getNextStepIndex(step);
      }
    }, SCHEDULER_TICK_MS);
  }

  function stop() {
    if (timer) {
      clearRuntimeInterval(timer);
      timer = null;
    }
    stepQueue = [];
  }

  function dispose() {
    stop();
    void context.close?.();
  }

  function applyLaneVolumes(style: BeatStyle) {
    const volumes = getLaneVolumes(style);
    for (const id of INSTRUMENT_IDS) {
      laneBuses[id].gain.value = volumes[id];
    }
  }

  function scheduleStep(style: BeatStyle, stepIndex: number, time: number) {
    for (const event of getStepEvents(style, stepIndex, time)) {
      voices[event.instrument](event.time, event.accent, event.pitch);
    }
  }

  function getActiveStepIndex(): number | null {
    return getActiveStep(stepQueue, context.currentTime);
  }

  function getFrequencyData(target: Uint8Array): boolean {
    if (!analyser) {
      return false;
    }
    analyser.getByteFrequencyData(target as Uint8Array<ArrayBuffer>);
    return true;
  }

  function playTagSample(time: number) {
    if (!tagSample) return;
    const { samples, sampleRate } = tagSample;
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channelData[i] = samples[i];
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start(time);
  }

  function setProducerTagSample(sample: ProducerTagSample | null) {
    tagSample = sample;
  }

  function setProducerTagConfig(config: ProducerTagConfigInput | null) {
    tagConfig = config;
  }

  function playClick(accent = false) {
    playClickAt(context.currentTime, accent, master);
  }

  function setMetronomeEnabled(enabled: boolean) {
    metronomeEnabled = enabled;
    metronomeGain.gain.cancelScheduledValues(context.currentTime);
    metronomeGain.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
  }

  function playClickAt(
    time: number,
    accent: boolean,
    destination: GainNode = metronomeGain,
  ) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(accent ? 1_200 : 900, time);
    gain.gain.setValueAtTime(accent ? 0.22 : 0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.05);
    runtime.onClickPlayed?.();
  }

  function playProducerTag(input: ProducerTagConfigInput | string) {
    const configInput = typeof input === "string" ? {} : input;
    if (typeof input !== "string" && input.enabled === false) return;
    if (configInput.source === "recorded" && tagSample) {
      playTagSample(context.currentTime);
      return;
    }

    const producerTagRuntime = getBrowserProducerTagRuntime();
    const plan = createProducerTagPlaybackPlan(
      typeof input === "string" ? { text: input, trigger: "manual" } : input,
      producerTagRuntime,
    );

    if (plan.action === "disabled") {
      return;
    }

    if (plan.action === "fallback") {
      playOpenHat(context.currentTime, 1.2);
      return;
    }

    const { speechSynthesis, SpeechSynthesisUtterance } = producerTagRuntime;
    if (!speechSynthesis || !SpeechSynthesisUtterance) {
      playOpenHat(context.currentTime, 1.2);
      return;
    }

    const utterance = createProducerTagUtterance(
      plan.config,
      SpeechSynthesisUtterance,
    );
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function playKick(time: number, accent = 1) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.16);
    gain.gain.setValueAtTime(0.9 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain).connect(laneBuses.kick);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  function playSnare(time: number, accent = 1) {
    const noise = createNoiseBuffer(0.16);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.frequency.value = 1900;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.42 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    source.connect(filter).connect(gain).connect(laneBuses.snare);
    source.start(time);
  }

  function playHat(time: number, accent = 1) {
    const noise = createNoiseBuffer(0.06);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = "highpass";
    filter.frequency.value = 6500;
    gain.gain.setValueAtTime(0.18 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    source.connect(filter).connect(gain).connect(laneBuses.hat);
    source.start(time);
  }

  function playOpenHat(time: number, accent = 1) {
    const noise = createNoiseBuffer(0.22);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = "highpass";
    filter.frequency.value = 5200;
    gain.gain.setValueAtTime(0.14 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    source.connect(filter).connect(gain).connect(laneBuses.openHat);
    source.start(time);
  }

  function playClap(time: number, accent = 1) {
    // Three quick band-passed noise bursts — the classic clap stagger.
    const offsets = [0, 0.011, 0.022];
    for (const offset of offsets) {
      const noise = createNoiseBuffer(0.09);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = noise;
      filter.type = "bandpass";
      filter.frequency.value = 1600;
      filter.Q.value = 0.7;
      const at = time + offset;
      gain.gain.setValueAtTime(0.4 * accent, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.09);
      source.connect(filter).connect(gain).connect(laneBuses.clap);
      source.start(at);
    }
  }

  function play808(time: number, accent = 1, pitch?: StepPitch) {
    const frequency = pitch?.frequency ?? 55;
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency * 1.45, time);
    osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.04);
    filter.type = "lowpass";
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.55 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(filter).connect(gain).connect(laneBuses["808"]);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  function playMelody(time: number, accent = 1, pitch?: StepPitch) {
    const frequency = pitch?.frequency ?? 440;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.26 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain).connect(laneBuses.melody);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  function createNoiseBuffer(duration: number) {
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  return {
    kind: "web-audio",
    ready,
    start,
    stop,
    dispose,
    playProducerTag,
    getActiveStep: getActiveStepIndex,
    getFrequencyData,
    setProducerTagSample,
    setProducerTagConfig,
    playClick,
    setMetronomeEnabled,
  };
}

function getDefaultWebAudioRuntime(): WebAudioBeatEngineRuntime {
  const browserWindow = globalThis.window;

  return {
    AudioContext: browserWindow?.AudioContext,
    webkitAudioContext: browserWindow?.webkitAudioContext,
    setInterval: browserWindow?.setInterval.bind(browserWindow),
    clearInterval: browserWindow?.clearInterval.bind(browserWindow),
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
