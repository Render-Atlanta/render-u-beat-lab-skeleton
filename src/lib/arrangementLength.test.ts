import { describe, expect, it } from "vitest";
import {
  createDefaultArrangement,
  getArrangementBarCount,
  getArrangementDurationSeconds,
  setSectionBars,
} from "./arrangement";

describe("arrangement length helpers", () => {
  it("updates section bar counts immutably and summarizes arrangement length", () => {
    const arrangement = createDefaultArrangement();
    const extended = setSectionBars(
      setSectionBars(arrangement, "main", 4),
      "variation",
      2,
    );

    expect(arrangement.sections.map((section) => section.bars)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(extended.sections.map((section) => section.bars)).toEqual([
      1, 4, 2, 1,
    ]);
    expect(getArrangementBarCount(extended)).toBe(8);
    expect(getArrangementDurationSeconds(extended, 120)).toBe(16);
  });

  it("clamps edited section bars to the supported workshop range", () => {
    const arrangement = setSectionBars(
      setSectionBars(createDefaultArrangement(), "intro", 0),
      "outro",
      100,
    );

    expect(arrangement.sections[0].bars).toBe(1);
    expect(arrangement.sections[3].bars).toBe(16);
  });
});
