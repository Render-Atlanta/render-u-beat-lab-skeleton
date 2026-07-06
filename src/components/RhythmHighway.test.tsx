import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RhythmHighway } from "./RhythmHighway";

describe("RhythmHighway", () => {
  it("renders a labelled canvas", () => {
    const html = renderToStaticMarkup(
      <RhythmHighway registerDraw={() => {}} laneCount={4} accent="#f5892b" />,
    );
    expect(html).toContain("<canvas");
    expect(html.toLowerCase()).toContain("note highway");
  });
});
