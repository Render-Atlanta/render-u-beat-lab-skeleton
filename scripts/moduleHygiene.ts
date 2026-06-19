/**
 * Pure logic for the module hygiene check (PR-19).
 *
 * The check is intentionally line-count based. A robust "exported
 * responsibility count" needs a real TypeScript parser to avoid false
 * positives from re-exports, types, and barrel files, so we keep this
 * thin and trustworthy: count non-empty source lines per file and flag
 * anything over its limit unless it is on the documented allowlist.
 */

/** Maximum lines for a regular source file (`*.ts`, `*.tsx`). */
export const MAX_SOURCE_LINES = 300;

/**
 * Maximum lines for a test file (`*.test.ts`, `*.test.tsx`). Tests get a
 * slightly higher budget because repeated setup and inline fixtures are
 * normal and not a code-smell.
 */
export const MAX_TEST_LINES = 350;

/**
 * Explicit, temporary allowlist for files that exceed the limit today.
 * Each entry is a promise to split the file later, not a permanent pass.
 * NEW files that exceed the limit are not exempt and will fail the check.
 */
export interface AllowlistEntry {
  /** Repo-relative path, using forward slashes. */
  path: string;
  /** One-line follow-up note explaining the temporary exception. */
  note: string;
}

export const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    path: "src/lib/arrangement.ts",
    note: "Temporary exception - split arrangement build vs. export/serialization helpers (follow-up).",
  },
  {
    path: "src/lib/micCapture.ts",
    note: "Temporary exception - extract permission/stream plumbing from the capture loop (follow-up).",
  },
  {
    path: "src/App.tsx",
    note: "Temporary exception - lift panel wiring into smaller container components (follow-up).",
  },
  {
    path: "src/lib/onsetDetection.ts",
    note: "Temporary exception - separate windowing/FFT helpers from onset scoring (follow-up).",
  },
  {
    path: "src/lib/beatboxClassifier.ts",
    note: "Temporary exception - move feature-extraction tables into their own module (follow-up).",
  },
  {
    path: "src/audio/webAudioBeatEngine.ts",
    note: "Temporary exception - extract clap/808 voice functions into a voices module (follow-up, PR-27).",
  },
];

export interface HygieneConfig {
  maxSourceLines: number;
  maxTestLines: number;
  allowlist: readonly AllowlistEntry[];
}

export const DEFAULT_CONFIG: HygieneConfig = {
  maxSourceLines: MAX_SOURCE_LINES,
  maxTestLines: MAX_TEST_LINES,
  allowlist: ALLOWLIST,
};

export interface SourceFile {
  /** Repo-relative path, using forward slashes. */
  path: string;
  /** Full file contents. */
  contents: string;
}

export interface Violation {
  path: string;
  lineCount: number;
  limit: number;
  isTest: boolean;
}

export function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path);
}

/**
 * Count source lines. Trailing blank lines are ignored so an editor's
 * final newline does not nudge a file over the limit.
 */
export function countLines(contents: string): number {
  const lines = contents.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  return lines.length;
}

export function limitFor(path: string, config: HygieneConfig): number {
  return isTestFile(path) ? config.maxTestLines : config.maxSourceLines;
}

/**
 * Find every file that exceeds its limit and is not on the allowlist.
 * Pure and deterministic so it can be unit tested without touching disk.
 */
export function findViolations(
  files: readonly SourceFile[],
  config: HygieneConfig = DEFAULT_CONFIG,
): Violation[] {
  const allowed = new Set(config.allowlist.map((entry) => entry.path));
  const violations: Violation[] = [];

  for (const file of files) {
    if (allowed.has(file.path)) {
      continue;
    }
    const limit = limitFor(file.path, config);
    const lineCount = countLines(file.contents);
    if (lineCount > limit) {
      violations.push({
        path: file.path,
        lineCount,
        limit,
        isTest: isTestFile(file.path),
      });
    }
  }

  return violations;
}

/**
 * Allowlist entries whose file is now within its limit (or gone). These
 * are stale promises that should be removed to keep the list honest.
 */
export function findStaleAllowlistEntries(
  files: readonly SourceFile[],
  config: HygieneConfig = DEFAULT_CONFIG,
): AllowlistEntry[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const stale: AllowlistEntry[] = [];

  for (const entry of config.allowlist) {
    const file = byPath.get(entry.path);
    if (!file) {
      stale.push(entry);
      continue;
    }
    if (countLines(file.contents) <= limitFor(entry.path, config)) {
      stale.push(entry);
    }
  }

  return stale;
}
