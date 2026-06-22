import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// PR-13 drum kit generator
//
// Synthesizes original, CC0 drum one-shots and writes them as small 16-bit PCM
// mono WAV files to public/kit. Layering + envelopes make these pre-rendered
// samples sound fuller than the bare MembraneSynth/NoiseSynth live fallback.
//
// DETERMINISTIC: noise comes from a seeded PRNG (no Math.random/Date.now), so
// re-running yields byte-identical output and avoids git churn.
//
// Run with: npm run generate:kit
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 22_050;
const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "public", "kit");
type KitVariant = "classic" | "punchy" | "airy";

const VARIANT_DIRS: Record<KitVariant, string> = {
  classic: "",
  punchy: "punchy",
  airy: "airy",
};

/** Deterministic mulberry32 PRNG returning floats in [-1, 1). */
function createNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

function seconds(count: number): number {
  return Math.round(count * SAMPLE_RATE);
}

/** Exponential decay envelope: 1 at start, ~0 at the tail. */
function decayEnv(index: number, length: number, shape: number): number {
  return Math.exp((-shape * index) / length);
}

function kick(): Float32Array {
  const length = seconds(0.32);
  const out = new Float32Array(length);
  const noise = createNoise(0x1001);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    // Pitch sweep from ~120Hz down to ~45Hz for the body.
    const freq = 45 + 75 * Math.exp(-28 * t);
    const phase = 2 * Math.PI * (45 * t + (75 / 28) * (1 - Math.exp(-28 * t)));
    const body = Math.sin(phase) * decayEnv(i, length, 5.5);
    // Short click transient for attack definition.
    const click = noise() * decayEnv(i, length, 220) * 0.35;
    out[i] = body * 0.92 + click;
  }
  return normalize(out, 0.92);
}

function snare(): Float32Array {
  const length = seconds(0.22);
  const out = new Float32Array(length);
  const noise = createNoise(0x2002);
  let prev = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    // Tonal body: two detuned sines around 180/240Hz.
    const tone =
      (Math.sin(2 * Math.PI * 180 * t) + 0.6 * Math.sin(2 * Math.PI * 240 * t)) *
      decayEnv(i, length, 9);
    // High-passed noise (1-pole) for the rattle.
    const raw = noise();
    const hp = raw - prev;
    prev = raw;
    const rattle = hp * decayEnv(i, length, 5);
    out[i] = tone * 0.4 + rattle * 0.85;
  }
  return normalize(out, 0.9);
}

function closedHat(): Float32Array {
  const length = seconds(0.06);
  const out = new Float32Array(length);
  const noise = createNoise(0x3003);
  let prev = 0;
  for (let i = 0; i < length; i += 1) {
    const raw = noise();
    // Bright: aggressive high-pass via differencing.
    const hp = raw - prev * 0.92;
    prev = raw;
    out[i] = hp * decayEnv(i, length, 16);
  }
  return normalize(out, 0.8);
}

function openHat(): Float32Array {
  const length = seconds(0.34);
  const out = new Float32Array(length);
  const noise = createNoise(0x4004);
  let prev = 0;
  for (let i = 0; i < length; i += 1) {
    const raw = noise();
    const hp = raw - prev * 0.9;
    prev = raw;
    // Longer, sizzling decay tail.
    out[i] = hp * decayEnv(i, length, 4.5);
  }
  return normalize(out, 0.78);
}

function clap(): Float32Array {
  const length = seconds(0.22);
  const out = new Float32Array(length);
  const noise = createNoise(0x5005);
  let prev = 0;
  // Three quick noise bursts (the classic clap stagger) then a tail.
  const bursts = [0, 0.011, 0.022];
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const raw = noise();
    const hp = raw - prev * 0.7;
    prev = raw;
    let amp = 0;
    for (const onset of bursts) {
      if (t >= onset) amp += Math.exp(-90 * (t - onset));
    }
    amp += 0.4 * Math.exp(-12 * t); // body tail
    out[i] = hp * amp;
  }
  return normalize(out, 0.85);
}

function eightOhEight(): Float32Array {
  const length = seconds(0.4);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    // Sub sine ~55Hz with a slight downward glide and long decay.
    const freq = 55 + 25 * Math.exp(-40 * t);
    const phase = 2 * Math.PI * (55 * t + (25 / 40) * (1 - Math.exp(-40 * t)));
    out[i] = Math.sin(phase) * decayEnv(i, length, 3.5);
    void freq;
  }
  return normalize(out, 0.95);
}

/** Scale a buffer so its peak hits `peak`. */
function normalize(samples: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  if (max === 0) return samples;
  const gain = peak / max;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
  return samples;
}

function trimTail(samples: Float32Array, ratio: number): Float32Array {
  const length = Math.max(1, Math.round(samples.length * ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const fade = i > length * 0.72 ? 1 - (i - length * 0.72) / (length * 0.28) : 1;
    out[i] = samples[i] * Math.max(0, fade);
  }
  return out;
}

function softClip(samples: Float32Array, drive: number): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = Math.tanh(samples[i] * drive) / Math.tanh(drive);
  }
  return out;
}

function brighten(samples: Float32Array, amount: number): Float32Array {
  const out = new Float32Array(samples.length);
  let previous = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const high = samples[i] - previous * 0.72;
    previous = samples[i];
    out[i] = samples[i] * (1 - amount) + high * amount;
  }
  return out;
}

function addShortRoom(samples: Float32Array, gain: number): Float32Array {
  const out = new Float32Array(samples.length + seconds(0.05));
  out.set(samples);
  const taps = [
    { offset: seconds(0.013), gain },
    { offset: seconds(0.029), gain: gain * 0.55 },
  ];
  for (const tap of taps) {
    for (let i = 0; i < samples.length; i += 1) {
      out[i + tap.offset] += samples[i] * tap.gain;
    }
  }
  return out;
}

function renderVariant(name: string, render: () => Float32Array, variant: KitVariant): Float32Array {
  const source = render();
  if (variant === "punchy") {
    const shorter = name === "openHat" || name === "808" ? 0.82 : 0.72;
    return normalize(softClip(trimTail(source, shorter), 1.8), 0.9);
  }
  if (variant === "airy") {
    return normalize(addShortRoom(brighten(source, 0.42), 0.16), 0.82);
  }
  return source;
}

/** Encode mono float samples [-1, 1] as a 16-bit PCM WAV file. */
function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }
  return buffer;
}

const PIECES: Record<string, () => Float32Array> = {
  kick,
  snare,
  hat: closedHat,
  openHat,
  clap,
  "808": eightOhEight,
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;
  for (const variant of Object.keys(VARIANT_DIRS) as KitVariant[]) {
    const dir = join(OUT_DIR, VARIANT_DIRS[variant]);
    mkdirSync(dir, { recursive: true });
    for (const [name, render] of Object.entries(PIECES)) {
      const wav = encodeWav(renderVariant(name, render, variant), SAMPLE_RATE);
      const file = join(dir, `${name}.wav`);
      writeFileSync(file, wav);
      total += wav.byteLength;
      console.log(`  ${variant}/${name}.wav  ${wav.byteLength} bytes`);
    }
  }
  console.log(`Wrote ${Object.keys(PIECES).length * Object.keys(VARIANT_DIRS).length} samples (${total} bytes total) to public/kit`);
}

main();
