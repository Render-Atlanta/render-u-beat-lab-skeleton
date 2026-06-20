import { LESSONS } from "./lessons";

const STORAGE_KEY = "beatlab.lesson";

/** Best-effort access to localStorage; returns null where it is unavailable. */
function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The lesson the learner last opened, or null for the lesson list. Unknown or
 * stale ids (a lesson that no longer exists) fall back to null. */
export function readLessonPref(
  storage: Storage | null = defaultStorage(),
): string | null {
  try {
    const stored = storage?.getItem(STORAGE_KEY) ?? null;
    return LESSONS.some((lesson) => lesson.id === stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Persist the active lesson id (null clears it); never throws. */
export function writeLessonPref(
  lessonId: string | null,
  storage: Storage | null = defaultStorage(),
): void {
  try {
    if (lessonId === null) {
      storage?.removeItem(STORAGE_KEY);
    } else {
      storage?.setItem(STORAGE_KEY, lessonId);
    }
  } catch {
    // Storage unavailable — preference is best-effort only.
  }
}
