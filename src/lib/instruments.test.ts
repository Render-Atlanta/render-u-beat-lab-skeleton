import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./instruments";

describe("INSTRUMENTS guidedTip", () => {
  it("every lane has a non-empty guided tip", () => {
    for (const instrument of INSTRUMENTS) {
      expect(typeof instrument.guidedTip).toBe("string");
      expect(instrument.guidedTip.length).toBeGreaterThan(0);
    }
  });
});
