import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MidiControllerPanel } from "./MidiControllerPanel";

function noop() {}

describe("MidiControllerPanel", () => {
  it("renders the MIDI controls and default note map", () => {
    const html = renderToStaticMarkup(
      <MidiControllerPanel activeStep={null} onTrigger={noop} />,
    );

    expect(html).toContain("MIDI idle");
    expect(html).toContain("Follow playhead");
    expect(html).toContain("Auto-advance");
    expect(html).toContain("36 · Kick");
    expect(html).toContain("48 · Melody");
  });
});
