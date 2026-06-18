import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import {
  formatOpenReferenceMeta,
  getBundleableOpenReferences,
  getOpenReferences,
  isAllowedBundleLicense,
  OPEN_REFERENCES,
  selectBundleable,
  validateOpenReferences,
  type OpenReferenceExample,
} from "./openReferences";

const STYLE_IDS = Object.keys(BEAT_STYLES) as BeatStyleId[];

const okEntry = (over: Partial<OpenReferenceExample> = {}): OpenReferenceExample => ({
  title: "Test loop",
  creator: "Test creator",
  sourceUrl: "https://example.com/loop",
  license: "CC0",
  attributionText: "Test creator, CC0.",
  styleFit: "Fits the test groove.",
  bundleable: true,
  verified: true,
  bpm: 120,
  ...over,
});

const manifestOf = (entries: OpenReferenceExample[]): Record<BeatStyleId, OpenReferenceExample[]> =>
  Object.fromEntries(STYLE_IDS.map((id) => [id, entries])) as Record<
    BeatStyleId,
    OpenReferenceExample[]
  >;

describe("OPEN_REFERENCES coverage", () => {
  it("gives every supported style at least one reviewed open candidate", () => {
    for (const styleId of STYLE_IDS) {
      expect(getOpenReferences(styleId).length).toBeGreaterThan(0);
    }
  });

  it("gives every supported style at least one bundleable+verified candidate", () => {
    for (const styleId of STYLE_IDS) {
      expect(getBundleableOpenReferences(styleId).length).toBeGreaterThan(0);
    }
  });

  it("ships only the in-repo CC0 originals as bundleable examples", () => {
    for (const styleId of STYLE_IDS) {
      for (const ref of getBundleableOpenReferences(styleId)) {
        expect(ref.license).toBe("CC0");
        expect(ref.creator).toBe("Render U Beat Lab (original)");
      }
    }
  });
});

describe("validateOpenReferences (real manifest)", () => {
  it("returns no issues for the shipped manifest", () => {
    expect(validateOpenReferences()).toEqual([]);
  });

  it("validates the default export when called with no argument", () => {
    expect(validateOpenReferences(OPEN_REFERENCES)).toEqual([]);
  });
});

describe("validateOpenReferences (crafted fixtures)", () => {
  it("rejects a bundleable entry with an unsupported NC license", () => {
    const issues = validateOpenReferences(
      manifestOf([okEntry({ license: "CC-BY-NC" })]),
    );
    expect(issues.some((i) => /disallowed license/i.test(i.reason))).toBe(true);
  });

  it("rejects every disallowed license when bundleable", () => {
    const disallowed = ["CC-BY-ND", "CC-BY-NC-SA", "CC-BY-NC-ND", "ARR", "unclear"] as const;
    for (const license of disallowed) {
      const issues = validateOpenReferences(manifestOf([okEntry({ license })]));
      expect(issues.some((i) => /disallowed license/i.test(i.reason))).toBe(true);
    }
  });

  it("accepts disallowed licenses when the entry is only link-only", () => {
    const issues = validateOpenReferences(
      manifestOf([
        okEntry(),
        okEntry({ license: "CC-BY-NC", bundleable: false, verified: false }),
      ]),
    );
    expect(issues).toEqual([]);
  });

  it("accepts the allowed bundle licenses", () => {
    for (const license of ["CC0", "CC-BY", "CC-BY-SA"] as const) {
      const issues = validateOpenReferences(manifestOf([okEntry({ license })]));
      expect(issues).toEqual([]);
    }
  });

  it("rejects an empty attributionText", () => {
    const issues = validateOpenReferences(manifestOf([okEntry({ attributionText: "   " })]));
    expect(issues.some((i) => /attributionText/i.test(i.reason))).toBe(true);
  });

  it("rejects a missing required field", () => {
    const issues = validateOpenReferences(manifestOf([okEntry({ sourceUrl: "" })]));
    expect(issues.some((i) => /sourceUrl/i.test(i.reason))).toBe(true);
  });

  it("rejects a bundleable+unverified entry", () => {
    const issues = validateOpenReferences(manifestOf([okEntry({ verified: false })]));
    expect(issues.some((i) => /must be verified/i.test(i.reason))).toBe(true);
  });

  it("rejects an invalid bpm", () => {
    const issues = validateOpenReferences(manifestOf([okEntry({ bpm: -5 })]));
    expect(issues.some((i) => /bpm/i.test(i.reason))).toBe(true);
  });

  it("allows a null bpm", () => {
    const issues = validateOpenReferences(manifestOf([okEntry({ bpm: null })]));
    expect(issues).toEqual([]);
  });

  it("flags a style with zero entries", () => {
    const manifest = manifestOf([okEntry()]);
    manifest.trap = [];
    const issues = validateOpenReferences(manifest);
    expect(issues.some((i) => i.styleId === "trap" && /zero open-license/i.test(i.reason))).toBe(
      true,
    );
  });

  it("flags a style with no bundleable+verified entry", () => {
    const manifest = manifestOf([okEntry()]);
    manifest.pop = [okEntry({ bundleable: false, verified: false })];
    const issues = validateOpenReferences(manifest);
    expect(
      issues.some((i) => i.styleId === "pop" && /zero bundleable\+verified/i.test(i.reason)),
    ).toBe(true);
  });
});

describe("helpers", () => {
  it("isAllowedBundleLicense gates the allowed set", () => {
    expect(isAllowedBundleLicense("CC0")).toBe(true);
    expect(isAllowedBundleLicense("CC-BY")).toBe(true);
    expect(isAllowedBundleLicense("CC-BY-SA")).toBe(true);
    expect(isAllowedBundleLicense("CC-BY-NC")).toBe(false);
    expect(isAllowedBundleLicense("ARR")).toBe(false);
    expect(isAllowedBundleLicense("unclear")).toBe(false);
  });

  it("getBundleableOpenReferences drops link-only and unverified entries", () => {
    const refs = [
      okEntry(),
      okEntry({ bundleable: false }),
      okEntry({ verified: false }),
      okEntry({ license: "CC-BY-NC" }),
    ];
    const filtered = selectBundleable(refs);
    expect(filtered).toHaveLength(1);
  });

  it("formatOpenReferenceMeta summarizes bpm, license, and bundle state", () => {
    expect(formatOpenReferenceMeta(okEntry())).toBe("120 BPM · CC0 · bundleable");
    expect(formatOpenReferenceMeta(okEntry({ bpm: null, bundleable: false }))).toBe(
      "CC0 · link-only",
    );
  });
});
