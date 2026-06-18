import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  DEFAULT_CONFIG,
  findStaleAllowlistEntries,
  findViolations,
  type SourceFile,
} from "./moduleHygiene";

const ROOT = join(import.meta.dirname, "..");
const SCAN_DIR = join(ROOT, "src");
const SOURCE_PATTERN = /\.tsx?$/;

/** Recursively collect `*.ts`/`*.tsx` files under a directory. */
function collectSourceFiles(dir: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && SOURCE_PATTERN.test(entry.name)) {
      files.push({
        path: relative(ROOT, fullPath).split(sep).join("/"),
        contents: readFileSync(fullPath, "utf8"),
      });
    }
  }
  return files;
}

function main(): void {
  const files = collectSourceFiles(SCAN_DIR);
  const violations = findViolations(files, DEFAULT_CONFIG);
  const stale = findStaleAllowlistEntries(files, DEFAULT_CONFIG);

  if (stale.length > 0) {
    console.warn(
      `Module hygiene: ${stale.length} allowlist entr${stale.length === 1 ? "y is" : "ies are"} stale ` +
        "(now within the limit or removed). Please drop them from ALLOWLIST in scripts/moduleHygiene.ts:",
    );
    for (const entry of stale) {
      console.warn(`  - ${entry.path}`);
    }
  }

  if (violations.length === 0) {
    console.log(
      `Module hygiene OK: ${files.length} files scanned, ` +
        `limit ${DEFAULT_CONFIG.maxSourceLines} lines ` +
        `(${DEFAULT_CONFIG.maxTestLines} for tests), ` +
        `${DEFAULT_CONFIG.allowlist.length} documented exceptions.`,
    );
    return;
  }

  console.error(
    `Module hygiene FAILED: ${violations.length} file${violations.length === 1 ? "" : "s"} ` +
      "over the line limit and not on the allowlist.\n",
  );
  for (const violation of violations) {
    const kind = violation.isTest ? "test" : "source";
    console.error(
      `  ${violation.path} - ${violation.lineCount} lines ` +
        `(limit ${violation.limit} for ${kind} files)`,
    );
  }
  console.error(
    "\nSplit the file into focused modules, or - if a split is risky right now - " +
      "add it to ALLOWLIST in scripts/moduleHygiene.ts with a follow-up note. " +
      "See docs/CODE_QUALITY.md.",
  );
  process.exit(1);
}

main();
