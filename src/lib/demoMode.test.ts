import { describe, expect, it } from "vitest";
import { DEMO_MODE_STEPS, advanceDemoStepIndex } from "./demoMode";

describe("demoMode", () => {
  it("defines the workshop demo path in order", () => {
    expect(DEMO_MODE_STEPS.map((step) => step.id)).toEqual([
      "style",
      "fill",
      "arrange",
      "tag",
      "export",
    ]);
  });

  it("advances to the completed step without moving backwards", () => {
    expect(advanceDemoStepIndex(0, "style")).toBe(1);
    expect(advanceDemoStepIndex(3, "fill")).toBe(3);
  });
});
