// src/components/StyleFidelityMeter.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { loadKitFromDisk } from "../lib/loadKit.node";
import { StyleFidelityMeter } from "./StyleFidelityMeter";

describe("StyleFidelityMeter", () => {
  it("renders a percentage for the canonical pattern", () => {
    const kit = loadKitFromDisk();
    const html = renderToStaticMarkup(
      <StyleFidelityMeter style={BEAT_STYLES.trap} kit={kit} />,
    );
    expect(html).toMatch(/%/);
    expect(html.toLowerCase()).toContain("trap");
  });

  it("shows a loading state when the kit is null", () => {
    const html = renderToStaticMarkup(
      <StyleFidelityMeter style={BEAT_STYLES.trap} kit={null} kitError={false} />,
    );
    expect(html.toLowerCase()).toMatch(/loading|…|\.\.\./);
  });

  it("shows unavailable state when kitError is true", () => {
    const html = renderToStaticMarkup(
      <StyleFidelityMeter style={BEAT_STYLES.trap} kit={null} kitError={true} />,
    );
    expect(html).toMatch(/unavailable/);
    expect(html.toLowerCase()).not.toMatch(/analyzing|…/);
  });
});
