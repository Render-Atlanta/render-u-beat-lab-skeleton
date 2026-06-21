import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkshopChecklist } from "./WorkshopChecklist";

const baseProps = {
  styleName: "Atlanta Trap",
  activeSteps: 26,
  tagReady: true,
  tagTrigger: "intro" as const,
  arrangementBars: 4,
  exportReady: false,
  onOpenTag: () => {},
  onOpenArrange: () => {},
};

describe("WorkshopChecklist", () => {
  it("summarizes the workshop path progress", () => {
    const html = renderToStaticMarkup(<WorkshopChecklist {...baseProps} />);

    expect(html).toContain("Workshop path");
    expect(html).toContain("3 of 4 ready");
    expect(html).toContain("Atlanta Trap");
    expect(html).toContain("26 hits");
    expect(html).toContain("intro trigger");
  });

  it("counts export as ready after an export action", () => {
    const html = renderToStaticMarkup(
      <WorkshopChecklist {...baseProps} exportReady />,
    );

    expect(html).toContain("4 of 4 ready");
    expect(html).toContain("ready");
  });

  it("does not count export as ready just because the arrangement is longer", () => {
    const html = renderToStaticMarkup(
      <WorkshopChecklist {...baseProps} arrangementBars={8} />,
    );

    expect(html).toContain("3 of 4 ready");
    expect(html).toContain("8 bars");
  });
});
