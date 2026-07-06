// src/components/RhythmGameView.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RhythmGameView } from "./RhythmGameView";

describe("RhythmGameView", () => {
  it("shows the stage-select grid with all six stages on first render", () => {
    const html = renderToStaticMarkup(<RhythmGameView onExit={() => {}} />);
    for (const name of [
      "Airport Arrival", "Connector Sprint", "Badge Pickup",
      "Vendor Hall", "Main Stage", "Afterparty",
    ]) {
      expect(html).toContain(name);
    }
  });
});
