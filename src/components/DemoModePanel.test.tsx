import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { DemoModeStep } from "../lib/demoMode";
import { DemoModePanel } from "./DemoModePanel";

const steps: DemoModeStep[] = [
  {
    id: "style",
    label: "Make it bounce",
    detail: "Switch to the workshop groove.",
    actionLabel: "Run",
  },
  {
    id: "fill",
    label: "Add a fill",
    detail: "Put motion into the loop.",
    actionLabel: "Run",
  },
];

describe("DemoModePanel", () => {
  it("renders demo steps and the active position", () => {
    const html = renderToStaticMarkup(
      <DemoModePanel
        steps={steps}
        activeIndex={0}
        onRunStep={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("Demo mode");
    expect(html).toContain("1 of 2");
    expect(html).toContain("Make it bounce");
    expect(html).toContain("Add a fill");
  });

  it("shows completion copy when every step has run", () => {
    const html = renderToStaticMarkup(
      <DemoModePanel
        steps={steps}
        activeIndex={2}
        onRunStep={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("Demo complete");
    expect(html).toContain("Replay");
  });
});
