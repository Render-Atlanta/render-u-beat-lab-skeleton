import {
  classifyBeatboxHits,
  type BeatboxLaneClassification,
} from "./beatboxClassifier";
import { createMeydaBeatboxAnalysisProvider } from "./meydaBeatboxAnalysis";
import type { MicCaptureError, MicCaptureResult } from "./micCapture";
import {
  createOnsetPreview,
  type OnsetPreview,
} from "./onsetDetection";

export type MicCaptureState =
  | { status: "idle" }
  | { status: "recording" }
  | {
      status: "captured";
      result: MicCaptureResult;
      preview: OnsetPreview;
      classifications: BeatboxLaneClassification[];
    }
  | { status: "error"; message: string };

export interface CaptureAnalysis {
  preview: OnsetPreview;
  classifications: BeatboxLaneClassification[];
}

export function createCaptureOnsetPreview(
  result: MicCaptureResult,
  sensitivity: number,
  quantizationDurationMs: number,
): OnsetPreview {
  return createOnsetPreview({
    levels: result.levels,
    waveform: result.waveform,
    durationMs: result.durationMs,
    quantizationDurationMs,
    sensitivity,
    levelSource: "mixed",
  });
}

export function createCaptureAnalysis(
  result: MicCaptureResult,
  sensitivity: number,
  quantizationDurationMs: number,
): CaptureAnalysis {
  const preview = createCaptureOnsetPreview(result, sensitivity, quantizationDurationMs);

  return {
    preview,
    classifications: classifyBeatboxHits(preview, result.levels, {
      durationMs: result.durationMs,
      provider: createMeydaBeatboxAnalysisProvider(),
      waveform: result.waveform,
    }),
  };
}

export function getMicCaptureErrorMessage(error: unknown): string {
  const captureError = error as Partial<MicCaptureError>;

  switch (captureError.code) {
    case "permission-denied":
      return "Microphone permission was denied. Manual beat-making still works.";
    case "no-device":
      return "No microphone was found. Plug one in or keep using the grid.";
    case "unsupported":
      return "This browser cannot capture microphone audio here.";
    case "capture-failed":
      return "The microphone could not be read. Another app may be using it.";
    default:
      return "Microphone capture failed, but the sequencer is still ready.";
  }
}

export function getMicStateCopy(micState: MicCaptureState): string {
  if (micState.status === "recording") {
    return "Listening for table taps or beatboxing. Keep it short and percussive.";
  }

  if (micState.status === "captured") {
    return `Detected ${micState.preview.cleanedHits.length} cleaned hits from ${
      micState.preview.rawHits.length
    } raw hits. ${countClassificationsNeedingCorrection(
      micState.classifications,
    )} need a lane check.`;
  }

  if (micState.status === "error") {
    return micState.message;
  }

  return "Record a short rhythm. Nothing uploads; the sample stays in this tab.";
}

export function countClassificationsNeedingCorrection(
  classifications: ReadonlyArray<Pick<BeatboxLaneClassification, "needsCorrection">>,
): number {
  return classifications.filter((classification) => classification.needsCorrection).length;
}
