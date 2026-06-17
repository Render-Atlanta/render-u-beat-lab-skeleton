import type { BeatStyle } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";
import {
  createProducerTagPlaybackPlan,
  createProducerTagUtterance,
  getBrowserProducerTagRuntime,
  type ProducerTagConfigInput,
} from "../lib/producerTag";
import type { AudioEngine } from "./audioEngine";
import {
  getNextStepIndex,
  getStepEvents,
  getSwingStepDurationSeconds,
  SCHEDULE_AHEAD_SECONDS,
  SCHEDULER_TICK_MS,
  START_DELAY_SECONDS,
} from "./transport";

type DrumVoice = (time: number, accent?: number) => void;

export interface WebAudioBeatEngineRuntime {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
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

  const master = context.createGain();
  master.gain.value = 0.65;
  master.connect(context.destination);

  const voices: Record<InstrumentId, DrumVoice> = {
    kick: playKick,
    snare: playSnare,
    hat: playHat,
    openHat: playOpenHat,
  };

  async function ready() {
    if (context.state !== "running") {
      await context.resume();
    }
  }

  function start(style: BeatStyle) {
    stop();
    step = 0;
    nextStepTime = context.currentTime + START_DELAY_SECONDS;

    timer = setRuntimeInterval(() => {
      while (nextStepTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
        scheduleStep(style, step, nextStepTime);
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
  }

  function dispose() {
    stop();
    void context.close?.();
  }

  function scheduleStep(style: BeatStyle, stepIndex: number, time: number) {
    for (const event of getStepEvents(style, stepIndex, time)) {
      voices[event.instrument](event.time, event.accent);
    }
  }

  function playProducerTag(input: ProducerTagConfigInput | string) {
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
    osc.connect(gain).connect(master);
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
    source.connect(filter).connect(gain).connect(master);
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
    source.connect(filter).connect(gain).connect(master);
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
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
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

  return { kind: "web-audio", ready, start, stop, dispose, playProducerTag };
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
