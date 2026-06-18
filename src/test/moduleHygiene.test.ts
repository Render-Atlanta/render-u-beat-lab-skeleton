import { describe, expect, it } from "vitest";
import {
  countLines,
  findStaleAllowlistEntries,
  findViolations,
  isTestFile,
  limitFor,
  type HygieneConfig,
  type SourceFile,
} from "../../scripts/moduleHygiene";

const CONFIG: HygieneConfig = {
  maxSourceLines: 10,
  maxTestLines: 20,
  allowlist: [{ path: "src/legacy.ts", note: "temporary - split later" }],
};

function makeFile(path: string, lines: number): SourceFile {
  return { path, contents: "x\n".repeat(lines) };
}

describe("module hygiene logic", () => {
  it("counts lines and ignores trailing blank lines", () => {
    expect(countLines("a\nb\nc")).toBe(3);
    expect(countLines("a\nb\n\n\n")).toBe(2);
    expect(countLines("")).toBe(0);
  });

  it("classifies test files", () => {
    expect(isTestFile("src/lib/foo.test.ts")).toBe(true);
    expect(isTestFile("src/lib/foo.test.tsx")).toBe(true);
    expect(isTestFile("src/lib/foo.ts")).toBe(false);
  });

  it("applies a higher limit to test files", () => {
    expect(limitFor("src/a.ts", CONFIG)).toBe(10);
    expect(limitFor("src/a.test.ts", CONFIG)).toBe(20);
  });

  it("flags source files over the limit", () => {
    const violations = findViolations([makeFile("src/big.ts", 11)], CONFIG);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ path: "src/big.ts", limit: 10 });
  });

  it("passes files at or under the limit", () => {
    const violations = findViolations([makeFile("src/ok.ts", 10)], CONFIG);
    expect(violations).toHaveLength(0);
  });

  it("does not flag allowlisted files even when oversized", () => {
    const violations = findViolations([makeFile("src/legacy.ts", 999)], CONFIG);
    expect(violations).toHaveLength(0);
  });

  it("still flags a NEW oversized file not on the allowlist", () => {
    const violations = findViolations(
      [makeFile("src/legacy.ts", 999), makeFile("src/new.ts", 50)],
      CONFIG,
    );
    expect(violations.map((v) => v.path)).toEqual(["src/new.ts"]);
  });

  it("reports allowlist entries that are now within the limit as stale", () => {
    const stale = findStaleAllowlistEntries([makeFile("src/legacy.ts", 5)], CONFIG);
    expect(stale.map((e) => e.path)).toEqual(["src/legacy.ts"]);
  });

  it("reports allowlist entries for deleted files as stale", () => {
    const stale = findStaleAllowlistEntries([], CONFIG);
    expect(stale.map((e) => e.path)).toEqual(["src/legacy.ts"]);
  });

  it("keeps a still-oversized allowlist entry out of the stale list", () => {
    const stale = findStaleAllowlistEntries([makeFile("src/legacy.ts", 999)], CONFIG);
    expect(stale).toHaveLength(0);
  });
});
