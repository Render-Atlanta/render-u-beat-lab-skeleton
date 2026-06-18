import type { MeasuredProfile } from "./referenceAnalysis";

export type SwingLabel = "straight" | "light" | "medium" | "heavy";
const SWING_LABELS: SwingLabel[] = ["straight", "light", "medium", "heavy"];

export interface StyleReferenceProfileMeta {
  artist?: string;
  title?: string;
  sourceUrl?: string;
}

export interface StyleReferenceProfileDraft {
  metadata: { artist: string; title: string; sourceUrl: string };
  bpm: number;
  feelBpm?: number;
  swing: SwingLabel;
  profile: string;
  measured: MeasuredProfile;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const FEEL_BPM_THRESHOLD = 140;

export function buildReferenceProfile(
  measured: MeasuredProfile,
  meta: StyleReferenceProfileMeta = {},
): StyleReferenceProfileDraft {
  const bpm = Math.round(measured.detectedBpm);
  const feelBpm =
    measured.detectedBpm >= FEEL_BPM_THRESHOLD ? Math.round(measured.detectedBpm / 2) : undefined;

  const draft: StyleReferenceProfileDraft = {
    metadata: {
      artist: meta.artist ?? "",
      title: meta.title ?? "",
      sourceUrl: meta.sourceUrl ?? "",
    },
    bpm,
    swing: "straight",
    profile: buildNote(bpm, feelBpm, measured.onsetDensityPerSec),
    measured,
  };
  if (feelBpm !== undefined) draft.feelBpm = feelBpm;
  return draft;
}

export function validateReferenceProfile(draft: StyleReferenceProfileDraft): ValidationResult {
  const errors: string[] = [];
  if (!Number.isFinite(draft.bpm) || draft.bpm < 40 || draft.bpm > 300) {
    errors.push(`bpm out of range (40-300): ${draft.bpm}`);
  }
  if (!SWING_LABELS.includes(draft.swing)) {
    errors.push(`unknown swing label: ${draft.swing}`);
  }
  if (!draft.profile || draft.profile.trim().length === 0) {
    errors.push("profile note is empty");
  }
  // Validate every measured field with Number.isFinite so untyped/parsed drafts
  // (e.g. `measured: {}` or NaN values) are rejected, not silently accepted.
  if (!draft.measured) {
    errors.push("measured block missing");
  } else {
    const m = draft.measured;
    const nonNegative: Array<keyof MeasuredProfile> = [
      "detectedBpm",
      "tempoConfidence",
      "onsetCount",
      "onsetDensityPerSec",
      "durationSec",
    ];
    for (const field of nonNegative) {
      const value = m[field];
      if (!Number.isFinite(value) || value < 0) {
        errors.push(`measured.${field} must be a finite, non-negative number: ${value}`);
      }
    }
  }
  if (draft.feelBpm !== undefined && (!Number.isFinite(draft.feelBpm) || draft.feelBpm < 0)) {
    errors.push(`feelBpm must be a finite, non-negative number when present: ${draft.feelBpm}`);
  }
  return { valid: errors.length === 0, errors };
}

function densityDescriptor(densityPerSec: number): string {
  if (densityPerSec < 2) return "sparse";
  if (densityPerSec <= 6) return "moderate";
  return "busy";
}

function buildNote(bpm: number, feelBpm: number | undefined, densityPerSec: number): string {
  const feel = feelBpm !== undefined ? ` (half-time feel ~${feelBpm})` : "";
  const density = densityDescriptor(densityPerSec);
  return `Detected ~${bpm} BPM${feel}. ${capitalize(density)} onset density (${densityPerSec}/s).`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
