import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CountInOverlay } from "./CountInOverlay";

describe("CountInOverlay", () => {
  it("renders the active count-in beat", () => {
    expect(renderToStaticMarkup(<CountInOverlay beat={3} />)).toContain("bx-count");
    expect(renderToStaticMarkup(<CountInOverlay beat={3} />)).toContain(">3<");
  });

  it("renders nothing when count-in is inactive", () => {
    expect(renderToStaticMarkup(<CountInOverlay beat={null} />)).toBe("");
  });
});
