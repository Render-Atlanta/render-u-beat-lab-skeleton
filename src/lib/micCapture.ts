export const DEFAULT_MIC_CAPTURE_MS = 4_000;
export const DEFAULT_MIC_LEVEL_INTERVAL_MS = 50;
export const DEFAULT_MIC_WAVEFORM_BINS = 64;

export type MicCaptureErrorCode =
  | "unsupported"
  | "permission-denied"
  | "no-device"
  | "capture-failed";

export type MicCaptureSupport =
  | { supported: true }
  | { supported: false; code: "unsupported"; message: string };

export interface MicLevelFrame {
  atMs: number;
  rms: number;
  peak: number;
  zeroCrossingRate?: number;
}

export interface MicCaptureResult {
  durationMs: number;
  mimeType: string;
  blob: Blob;
  chunks: Blob[];
  levels: MicLevelFrame[];
  waveform: number[];
}

export interface MicCaptureRuntime {
  mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  MediaRecorder?: typeof MediaRecorder;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
  now?: () => number;
}

export interface MicCaptureMeter {
  readSamples(): Float32Array;
  stop(): void | Promise<void>;
}

export interface MicCaptureOptions {
  durationMs?: number;
  levelIntervalMs?: number;
  waveformBins?: number;
  constraints?: MediaStreamConstraints;
  runtime?: MicCaptureRuntime;
  createMeter?: (stream: MediaStream, runtime: RequiredMicRuntime) => MicCaptureMeter;
}

export interface RequiredMicRuntime {
  mediaDevices: Pick<MediaDevices, "getUserMedia">;
  AudioContext: typeof AudioContext;
  MediaRecorder: typeof MediaRecorder;
  setInterval: typeof globalThis.setInterval;
  clearInterval: typeof globalThis.clearInterval;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
  now: () => number;
}

export class MicCaptureError extends Error {
  readonly code: MicCaptureErrorCode;

  constructor(code: MicCaptureErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MicCaptureError";
    this.code = code;
  }
}

export function getMicCaptureSupport(runtime = getDefaultMicCaptureRuntime()): MicCaptureSupport {
  const AudioContextClass = runtime.AudioContext ?? runtime.webkitAudioContext;

  if (!runtime.mediaDevices?.getUserMedia) {
    return {
      supported: false,
      code: "unsupported",
      message: "This browser does not expose microphone capture.",
    };
  }

  if (!AudioContextClass) {
    return {
      supported: false,
      code: "unsupported",
      message: "This browser does not support Web Audio input metering.",
    };
  }

  if (!runtime.MediaRecorder) {
    return {
      supported: false,
      code: "unsupported",
      message: "This browser does not support in-memory microphone recording.",
    };
  }

  return { supported: true };
}

export async function captureMicrophoneSample(
  options: MicCaptureOptions = {},
): Promise<MicCaptureResult> {
  const runtime = requireMicRuntime(options.runtime);
  const durationMs = options.durationMs ?? DEFAULT_MIC_CAPTURE_MS;
  const levelIntervalMs = options.levelIntervalMs ?? DEFAULT_MIC_LEVEL_INTERVAL_MS;
  const waveformBins = options.waveformBins ?? DEFAULT_MIC_WAVEFORM_BINS;
  const constraints = options.constraints ?? {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  };

  let stream: MediaStream | null = null;
  let meter: MicCaptureMeter | null = null;

  try {
    stream = await runtime.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    throw mapMicCaptureError(error);
  }

  try {
    meter = options.createMeter
      ? options.createMeter(stream, runtime)
      : createWebAudioMeter(stream, runtime);

    const activeMeter = meter;
    let recorder: MediaRecorder;

    try {
      recorder = new runtime.MediaRecorder(stream);
    } catch (error) {
      throw mapMicCaptureError(error);
    }

    const chunks: Blob[] = [];
    const levels: MicLevelFrame[] = [];
    const frames: Float32Array[] = [];
    const startMs = runtime.now();

    return await new Promise<MicCaptureResult>((resolve, reject) => {
      let settled = false;
      let levelTimer: ReturnType<typeof runtime.setInterval> | null = null;
      let stopTimer: ReturnType<typeof runtime.setTimeout> | null = null;

      function cleanup() {
        if (levelTimer !== null) {
          runtime.clearInterval(levelTimer);
          levelTimer = null;
        }

        if (stopTimer !== null) {
          runtime.clearTimeout(stopTimer);
          stopTimer = null;
        }
      }

      function finish(result: MicCaptureResult) {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(result);
      }

      function fail(error: unknown) {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(mapMicCaptureError(error));
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = (event) => fail(event.error);
      recorder.onstop = () => {
        finish({
          durationMs,
          mimeType: recorder.mimeType,
          blob: new Blob(chunks, { type: recorder.mimeType }),
          chunks,
          levels,
          waveform: summarizeWaveformFrames(frames, waveformBins),
        });
      };

      levelTimer = runtime.setInterval(() => {
        const samples = activeMeter.readSamples();
        frames.push(samples);
        levels.push({
          atMs: runtime.now() - startMs,
          ...calculateAudioLevel(samples),
        });
      }, levelIntervalMs);

      stopTimer = runtime.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, durationMs);

      try {
        recorder.start();
      } catch (error) {
        fail(error);
      }
    });
  } finally {
    await meter?.stop();
    stopStream(stream);
  }
}

export function calculateAudioLevel(samples: ArrayLike<number>): Omit<MicLevelFrame, "atMs"> {
  if (samples.length === 0) {
    return { rms: 0, peak: 0, zeroCrossingRate: 0 };
  }

  let sumSquares = 0;
  let peak = 0;
  let zeroCrossings = 0;
  let previousSign = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clampAudioSample(samples[index]);
    const absolute = Math.abs(sample);
    const sign = sample > 0 ? 1 : sample < 0 ? -1 : previousSign;

    if (index > 0 && sign !== 0 && previousSign !== 0 && sign !== previousSign) {
      zeroCrossings += 1;
    }

    if (sign !== 0) {
      previousSign = sign;
    }

    sumSquares += sample * sample;
    peak = Math.max(peak, absolute);
  }

  return {
    rms: roundLevel(Math.sqrt(sumSquares / samples.length)),
    peak: roundLevel(peak),
    zeroCrossingRate: roundLevel(zeroCrossings / Math.max(1, samples.length - 1)),
  };
}

export function summarizeWaveform(samples: ArrayLike<number>, bins: number): number[] {
  if (bins < 1 || !Number.isInteger(bins)) {
    throw new Error(`Waveform bins must be a positive integer: ${bins}`);
  }

  if (samples.length === 0) {
    return Array.from({ length: bins }, () => 0);
  }

  return Array.from({ length: bins }, (_, binIndex) => {
    const start = Math.floor((binIndex * samples.length) / bins);
    const end = Math.max(start + 1, Math.floor(((binIndex + 1) * samples.length) / bins));
    let peak = 0;

    for (let sampleIndex = start; sampleIndex < end && sampleIndex < samples.length; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(clampAudioSample(samples[sampleIndex])));
    }

    return roundLevel(peak);
  });
}

export function summarizeWaveformFrames(frames: ReadonlyArray<ArrayLike<number>>, bins: number): number[] {
  const totalSamples = frames.reduce((total, frame) => total + frame.length, 0);

  if (totalSamples === 0) {
    return summarizeWaveform([], bins);
  }

  const merged = new Float32Array(totalSamples);
  let offset = 0;

  for (const frame of frames) {
    for (let index = 0; index < frame.length; index += 1) {
      merged[offset + index] = frame[index];
    }
    offset += frame.length;
  }

  return summarizeWaveform(merged, bins);
}

export function mapMicCaptureError(error: unknown): MicCaptureError {
  if (error instanceof MicCaptureError) {
    return error;
  }

  const name = readErrorName(error);

  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
    return new MicCaptureError(
      "permission-denied",
      "Microphone permission was denied.",
      { cause: error },
    );
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new MicCaptureError(
      "no-device",
      "No microphone input device was found.",
      { cause: error },
    );
  }

  if (name === "NotReadableError" || name === "AbortError") {
    return new MicCaptureError(
      "capture-failed",
      "The microphone could not be read. Another app may be using it.",
      { cause: error },
    );
  }

  if (name === "OverconstrainedError") {
    return new MicCaptureError(
      "no-device",
      "No microphone input device matched the requested constraints.",
      { cause: error },
    );
  }

  return new MicCaptureError(
    "capture-failed",
    "Microphone capture failed.",
    { cause: error },
  );
}

function getDefaultMicCaptureRuntime(): MicCaptureRuntime {
  const maybeWindow = typeof window === "undefined" ? undefined : window;

  return {
    mediaDevices: maybeWindow?.navigator.mediaDevices,
    AudioContext: maybeWindow?.AudioContext,
    webkitAudioContext: maybeWindow?.webkitAudioContext,
    MediaRecorder: maybeWindow?.MediaRecorder,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    now: () => performance.now(),
  };
}

function requireMicRuntime(runtime = getDefaultMicCaptureRuntime()): RequiredMicRuntime {
  const AudioContextClass = runtime.AudioContext ?? runtime.webkitAudioContext;
  const support = getMicCaptureSupport(runtime);

  if (!support.supported || !runtime.mediaDevices?.getUserMedia || !AudioContextClass || !runtime.MediaRecorder) {
    throw new MicCaptureError("unsupported", support.supported ? "Microphone capture is unsupported." : support.message);
  }

  return {
    mediaDevices: runtime.mediaDevices,
    AudioContext: AudioContextClass,
    MediaRecorder: runtime.MediaRecorder,
    setInterval: runtime.setInterval ?? globalThis.setInterval,
    clearInterval: runtime.clearInterval ?? globalThis.clearInterval,
    setTimeout: runtime.setTimeout ?? globalThis.setTimeout,
    clearTimeout: runtime.clearTimeout ?? globalThis.clearTimeout,
    now: runtime.now ?? (() => performance.now()),
  };
}

function createWebAudioMeter(stream: MediaStream, runtime: RequiredMicRuntime): MicCaptureMeter {
  const context = new runtime.AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  const source = context.createMediaStreamSource(stream);
  const samples = new Float32Array(analyser.fftSize);

  source.connect(analyser);

  return {
    readSamples() {
      analyser.getFloatTimeDomainData(samples);
      return new Float32Array(samples);
    },
    async stop() {
      source.disconnect();
      await context.close();
    },
  };
}

function stopStream(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) {
    track.stop();
  }
}

function readErrorName(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "name" in error) {
    const { name } = error as { name?: unknown };
    return typeof name === "string" ? name : undefined;
  }

  return undefined;
}

function clampAudioSample(sample: number): number {
  if (!Number.isFinite(sample)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, sample));
}

function roundLevel(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
