import {
  classifiedHitsToPattern,
  classifyBeatboxHits,
  type BeatboxAnalysisProvider,
  type BeatboxLaneClassification,
} from "./beatboxClassifier";
import { createMeydaBeatboxAnalysisProvider } from "./meydaBeatboxAnalysis";
import {
  createOnsetPreview,
  detectOnsets,
  waveformToAmplitudeEnvelope,
} from "./onsetDetection";
import { pickOneBarWindow } from "./oneBarWindow";
import type { Pattern } from "./patterns";
import { getSequencerLoopDurationMs } from "./sequencerDomain";
import { estimateTempo } from "./tempoEstimation";
import { waveformToLevelFrames } from "./waveformToLevelFrames";
import type { DecodedAudio } from "./wav";

export interface SongDecomposition {
  bpm: number;
  bpmConfidence: number;
  tempoCandidates: { bpm: number; weight: number }[];
  window: { startMs: number; bars: number };
  pattern: Pattern;
  classifications: BeatboxLaneClassification[];
  overallConfidence: number;
}

const DEFAULT_SENSITIVITY = 0.55;

export interface SongDecomposeOptions {
  sensitivity?: number;
  provider?: BeatboxAnalysisProvider;
  bpmOverride?: number;
  windowStartMs?: number;
}

/**
 * Decompose decoded audio into an estimated BPM and a quantized one-bar drum
 * pattern, reusing the existing onset→classify pipeline. The only new steps are
 * tempo estimation, the one-bar window pick, and the waveform→level-frame
 * adapter; everything else mirrors the mic-capture analysis wiring.
 */
export function decomposeSong(
  decoded: DecodedAudio,
  opts: SongDecomposeOptions = {},
): SongDecomposition {
  const sensitivity = opts.sensitivity ?? DEFAULT_SENSITIVITY;
  const { samples, sampleRate, durationMs } = decoded;

  // 0. Guard empty/malformed decodes so this is safe to call from any caller,
  //    not just the panel's try/catch.
  if (samples.length === 0 || !Number.isFinite(durationMs) || durationMs <= 0) {
    return {
      bpm: estimateTempo([]).bpm,
      bpmConfidence: 0,
      tempoCandidates: [],
      window: { startMs: 0, bars: 1 },
      pattern: classifiedHitsToPattern([]),
      classifications: [],
      overallConfidence: 0,
    };
  }

  // 1. Full-track onsets feed tempo estimation.
  const fullEnvelope = waveformToAmplitudeEnvelope(samples, durationMs);
  const fullOnsets = detectOnsets(fullEnvelope, { sensitivity });
  const onsetTimesMs = fullOnsets.map((onset) => onset.atMs);

  // 2. Tempo + one-bar length.
  const estimatedTempo = estimateTempo(onsetTimesMs);
  const tempo = normalizeTempoOverride(opts.bpmOverride) ?? estimatedTempo;
  const barMs = getSequencerLoopDurationMs(tempo.bpm);

  // 3. Slice the most onset-dense one bar out of the track.
  const pickedWindow = pickOneBarWindow(onsetTimesMs, barMs, durationMs);
  const startMs = clampWindowStart(opts.windowStartMs ?? pickedWindow.startMs, barMs, durationMs);
  const startSample = Math.round((startMs / 1000) * sampleRate);
  const barSamples = Math.round((barMs / 1000) * sampleRate);
  const windowed = samples.subarray(startSample, startSample + barSamples);
  // Use the ACTUAL windowed duration: when the window butts against the track
  // end (or the clip is shorter than a bar) `windowed` is shorter than a full
  // bar, and quantizing against the phantom full `barMs` would stretch onset
  // times onto the wrong steps.
  const windowedDurationMs = (windowed.length / sampleRate) * 1000;

  // 4. Quantize + classify on the windowed bar (mirrors captureAnalysis wiring).
  const preview = createOnsetPreview({
    waveform: windowed,
    durationMs: windowedDurationMs,
    quantizationDurationMs: windowedDurationMs,
    sensitivity,
  });
  const levels = waveformToLevelFrames(windowed, sampleRate);
  const provider = opts.provider ?? createMeydaBeatboxAnalysisProvider();
  const classifications = classifyBeatboxHits(preview, levels, {
    durationMs: windowedDurationMs,
    provider,
    waveform: windowed,
  });

  const pattern = classifiedHitsToPattern(classifications);
  const meanHitConfidence =
    classifications.length === 0
      ? 0
      : classifications.reduce((sum, hit) => sum + hit.confidence, 0) / classifications.length;
  const overallConfidence = Math.min(
    1,
    Math.max(0, (tempo.confidence + meanHitConfidence) / 2),
  );

  return {
    bpm: tempo.bpm,
    bpmConfidence: tempo.confidence,
    tempoCandidates: estimatedTempo.candidates.slice(0, 3),
    window: { startMs, bars: 1 },
    pattern,
    classifications,
    overallConfidence,
  };
}

function normalizeTempoOverride(bpm: number | undefined) {
  if (!Number.isFinite(bpm)) {
    return null;
  }

  const rounded = Math.round(bpm ?? 0);
  if (rounded < 60 || rounded > 180) {
    return null;
  }

  return {
    bpm: rounded,
    confidence: 1,
    candidates: [{ bpm: rounded, weight: 1 }],
  };
}

function clampWindowStart(
  startMs: number,
  barMs: number,
  durationMs: number,
): number {
  if (!Number.isFinite(startMs)) {
    return 0;
  }

  const maxStart = Math.max(0, durationMs - Math.min(barMs, durationMs));
  return Math.max(0, Math.min(maxStart, startMs));
}
