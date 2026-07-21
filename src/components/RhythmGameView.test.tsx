// src/components/RhythmGameView.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RhythmGameView } from "./RhythmGameView";

describe("RhythmGameView", () => {
  // The arcade itself renders inside a Phaser canvas mounted in a client-only
  // effect, so SSR yields just the host container + the exit control. The stage
  // grid, title, and HUD now live in-canvas (see src/game/*).
  it("renders the Phaser host container and a Beat Lab exit control", () => {
    const html = renderToStaticMarkup(<RhythmGameView onExit={() => {}} />);
    expect(html).toContain("rush-view__host");
    expect(html).toMatch(/Beat Lab/);
  });
});
