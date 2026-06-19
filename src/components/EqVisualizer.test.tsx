import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EqVisualizer } from "./EqVisualizer";

describe("EqVisualizer", () => {
  it("renders a labelled canvas", () => {
    const html = renderToStaticMarkup(
      <EqVisualizer engine={null} isPlaying={false} />,
    );
    expect(html).toContain("<canvas");
    expect(html.toLowerCase()).toContain("equalizer");
  });
});
