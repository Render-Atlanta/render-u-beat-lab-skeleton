import type { BeatStyle } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";

export interface BeatEngine {
  ready(): Promise<void>;
  start(style: BeatStyle): void;
  stop(): void;
  playProducerTag(text: string): void;
}

type DrumVoice = (time: number, accent?: number) => void;

export function createBeatEngine(): BeatEngine {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("This browser does not support the Web Audio API.");
  }

  const context = new AudioContextClass();
  let timer: number | null = null;
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
    nextStepTime = context.currentTime + 0.08;

    const sixteenth = 60 / style.bpm / 4;
    timer = window.setInterval(() => {
      while (nextStepTime < context.currentTime + 0.14) {
        scheduleStep(style, step, nextStepTime);
        const isOffbeat = step % 2 === 1;
        nextStepTime += sixteenth * (isOffbeat ? 1 + style.swing : 1 - style.swing);
        step = (step + 1) % 16;
      }
    }, 25);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function scheduleStep(style: BeatStyle, stepIndex: number, time: number) {
    for (const instrument of Object.keys(style.pattern) as InstrumentId[]) {
      if (style.pattern[instrument][stepIndex]) {
        const accent = stepIndex % 4 === 0 ? 1.12 : 1;
        voices[instrument](time, accent);
      }
    }
  }

  function playProducerTag(text: string) {
    const phrase = text.trim();
    if (!phrase || !("speechSynthesis" in window)) {
      playOpenHat(context.currentTime, 1.2);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 0.86;
    utterance.pitch = 0.72;
    utterance.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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

  return { ready, start, stop, playProducerTag };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
