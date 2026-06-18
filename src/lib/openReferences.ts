import type { BeatStyleId } from "./beatStyles";
import { BEAT_STYLES } from "./beatStyles";
import {
  ALLOWED_BUNDLE_LICENSES,
  OPEN_REFERENCES,
  type AllowedOpenLicense,
  type OpenLicense,
  type OpenReferenceExample,
} from "./openReferencesData";

export {
  ALLOWED_BUNDLE_LICENSES,
  OPEN_REFERENCES,
  type AllowedOpenLicense,
  type DisallowedOpenLicense,
  type OpenLicense,
  type OpenReferenceExample,
} from "./openReferencesData";

const ALL_STYLE_IDS = Object.keys(BEAT_STYLES) as BeatStyleId[];

/** Required string fields every entry must carry (non-empty). */
const REQUIRED_STRING_FIELDS: Array<keyof OpenReferenceExample> = [
  "title",
  "creator",
  "sourceUrl",
  "license",
  "attributionText",
  "styleFit",
];

/** True when the license is in the allowed-for-bundling set. */
export function isAllowedBundleLicense(license: OpenLicense): license is AllowedOpenLicense {
  return (ALLOWED_BUNDLE_LICENSES as readonly OpenLicense[]).includes(license);
}

/** All reviewed open-license examples for a style. */
export function getOpenReferences(styleId: BeatStyleId): OpenReferenceExample[] {
  return OPEN_REFERENCES[styleId] ?? [];
}

/**
 * Filter a list down to the entries safe to ship: bundleable AND verified AND
 * carrying an allowed license. Pure over its input so it can be unit-tested
 * directly with fixtures.
 */
export function selectBundleable(
  refs: readonly OpenReferenceExample[],
): OpenReferenceExample[] {
  return refs.filter(
    (ref) => ref.bundleable && ref.verified && isAllowedBundleLicense(ref.license),
  );
}

/**
 * Only the entries safe to ship for a style. This is what the app should
 * actually load/redistribute.
 */
export function getBundleableOpenReferences(styleId: BeatStyleId): OpenReferenceExample[] {
  return selectBundleable(getOpenReferences(styleId));
}

/** One-line summary for UI/docs, mirroring formatStyleReferenceMeta. */
export function formatOpenReferenceMeta(reference: OpenReferenceExample): string {
  const bpm = reference.bpm != null ? `${reference.bpm} BPM · ` : "";
  const bundle = reference.bundleable ? "bundleable" : "link-only";
  return `${bpm}${reference.license} · ${bundle}`;
}

export interface OpenReferenceIssue {
  styleId: BeatStyleId;
  /** Index within the style's entry list, or -1 for style-level issues. */
  index: number;
  reason: string;
}

function fieldIsEmpty(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function validateEntry(
  styleId: BeatStyleId,
  index: number,
  ref: OpenReferenceExample,
): OpenReferenceIssue[] {
  const issues: OpenReferenceIssue[] = [];
  const push = (reason: string): void => {
    issues.push({ styleId, index, reason });
  };

  for (const field of REQUIRED_STRING_FIELDS) {
    if (fieldIsEmpty(ref[field])) push(`missing or empty required field: ${field}`);
  }
  if (typeof ref.bundleable !== "boolean") push("bundleable must be a boolean");
  if (typeof ref.verified !== "boolean") push("verified must be a boolean");
  if (ref.bpm != null && (!Number.isFinite(ref.bpm) || ref.bpm < 0)) {
    push(`bpm must be a finite, non-negative number or null: ${ref.bpm}`);
  }

  if (ref.bundleable === true && !isAllowedBundleLicense(ref.license)) {
    push(`bundleable entry uses a disallowed license: ${ref.license}`);
  }
  if (ref.bundleable === true && ref.verified !== true) {
    push("bundleable entry must be verified");
  }
  return issues;
}

/**
 * Validate the open-reference manifest. Flags missing/empty required fields,
 * bundleable entries with a disallowed license (the core "reject unsupported
 * licenses" rule), unverified bundleable entries, and styles lacking coverage.
 */
export function validateOpenReferences(
  manifest: Record<BeatStyleId, OpenReferenceExample[]> = OPEN_REFERENCES,
): OpenReferenceIssue[] {
  const issues: OpenReferenceIssue[] = [];

  for (const styleId of ALL_STYLE_IDS) {
    const entries = manifest[styleId] ?? [];
    if (entries.length === 0) {
      issues.push({ styleId, index: -1, reason: "style has zero open-license entries" });
      continue;
    }
    entries.forEach((ref, index) => {
      issues.push(...validateEntry(styleId, index, ref));
    });
    const bundleable = entries.filter(
      (ref) => ref.bundleable && ref.verified && isAllowedBundleLicense(ref.license),
    );
    if (bundleable.length === 0) {
      issues.push({
        styleId,
        index: -1,
        reason: "style has zero bundleable+verified+allowed-license entries",
      });
    }
  }
  return issues;
}
