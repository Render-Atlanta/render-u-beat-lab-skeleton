export interface MixEffects {
  space: number;
  echo: number;
}

export const DEFAULT_MIX_EFFECTS: MixEffects = {
  space: 0,
  echo: 0,
};

export function normalizeMixEffects(input: Partial<MixEffects> = {}): MixEffects {
  return {
    space: clamp01(input.space ?? DEFAULT_MIX_EFFECTS.space),
    echo: clamp01(input.echo ?? DEFAULT_MIX_EFFECTS.echo),
  };
}

export function cloneMixEffects(effects: MixEffects): MixEffects {
  return { ...effects };
}

export function mixEffectsAreDefault(effects: MixEffects): boolean {
  const normalized = normalizeMixEffects(effects);
  return normalized.space === DEFAULT_MIX_EFFECTS.space &&
    normalized.echo === DEFAULT_MIX_EFFECTS.echo;
}

export function serializeMixEffects(effects: MixEffects): string {
  const normalized = normalizeMixEffects(effects);
  return `${Math.round(normalized.space * 100)},${Math.round(normalized.echo * 100)}`;
}

export function deserializeMixEffects(value: string | null): MixEffects | null {
  if (!value) {
    return null;
  }

  const parts = value.split(",");
  if (parts.length !== 2) {
    return null;
  }

  const [space, echo] = parts.map((part) => Number(part));
  if (!Number.isFinite(space) || !Number.isFinite(echo)) {
    return null;
  }

  return normalizeMixEffects({
    space: space / 100,
    echo: echo / 100,
  });
}

export function applyMixEffectsToPcm(
  source: Float32Array,
  sampleRate: number,
  effects: MixEffects,
): Float32Array {
  const normalized = normalizeMixEffects(effects);
  if (
    source.length === 0 ||
    sampleRate <= 0 ||
    mixEffectsAreDefault(normalized)
  ) {
    return new Float32Array(source);
  }

  const out = new Float32Array(source);
  applyEcho(out, source, sampleRate, normalized.echo);
  applySpace(out, source, sampleRate, normalized.space);
  return out;
}

function applyEcho(
  out: Float32Array,
  source: Float32Array,
  sampleRate: number,
  amount: number,
) {
  if (amount <= 0) {
    return;
  }

  const delaySamples = Math.round(sampleRate * 0.19);
  const secondDelaySamples = delaySamples * 2;
  const wet = amount * 0.42;
  const secondWet = amount * 0.18;

  for (let index = delaySamples; index < out.length; index += 1) {
    out[index] += source[index - delaySamples] * wet;
  }

  for (let index = secondDelaySamples; index < out.length; index += 1) {
    out[index] += source[index - secondDelaySamples] * secondWet;
  }
}

function applySpace(
  out: Float32Array,
  source: Float32Array,
  sampleRate: number,
  amount: number,
) {
  if (amount <= 0) {
    return;
  }

  const taps = [
    { seconds: 0.023, gain: 0.2 },
    { seconds: 0.041, gain: 0.16 },
    { seconds: 0.067, gain: 0.12 },
    { seconds: 0.109, gain: 0.08 },
  ];

  for (const tap of taps) {
    const offset = Math.round(sampleRate * tap.seconds);
    const wet = amount * tap.gain;
    for (let index = offset; index < out.length; index += 1) {
      out[index] += source[index - offset] * wet;
    }
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}
