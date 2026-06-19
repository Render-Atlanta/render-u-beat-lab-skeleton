export type GuidedPref = "guided" | "free";

const STORAGE_KEY = "beatlab.guidedMode";

/** Best-effort access to localStorage; returns null where it is unavailable. */
function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** First-time visitors (no key) and any failure fall back to guided. */
export function readGuidedPref(
  storage: Storage | null = defaultStorage(),
): GuidedPref {
  try {
    return storage?.getItem(STORAGE_KEY) === "free" ? "free" : "guided";
  } catch {
    return "guided";
  }
}

/** Persist the preference; never throws (private mode / disabled storage is fine). */
export function writeGuidedPref(
  pref: GuidedPref,
  storage: Storage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage unavailable — preference is best-effort only.
  }
}
