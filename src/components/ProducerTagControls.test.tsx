// src/components/ProducerTagControls.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeProducerTagConfig } from "../lib/producerTag";
import { ProducerTagControls } from "./ProducerTagControls";

const baseConfig = normalizeProducerTagConfig({});

const baseProps = {
  config: baseConfig,
  text: "Render U made this",
  enabled: true,
  trigger: "manual" as const,
  rate: 0.86,
  pitch: 0.72,
  source: "text" as const,
  recordedState: "none" as const,
  onTextChange: () => {},
  onEnabledChange: () => {},
  onTriggerChange: () => {},
  onRateChange: () => {},
  onPitchChange: () => {},
  onSourceChange: () => {},
  onRecord: () => {},
  onClearRecording: () => {},
};

describe("ProducerTagControls", () => {
  it("renders a source toggle (Type / Record)", () => {
    const html = renderToStaticMarkup(<ProducerTagControls {...baseProps} />);
    expect(html.toLowerCase()).toMatch(/type/);
    expect(html.toLowerCase()).toMatch(/record/);
  });

  it("offers an 'Every loop' trigger card", () => {
    const html = renderToStaticMarkup(<ProducerTagControls {...baseProps} />);
    expect(html).toMatch(/every loop/i);
    expect(html).toContain('data-trigger="loop"');
  });

  it("shows Re-record and Clear when recordedState is recorded", () => {
    const html = renderToStaticMarkup(
      <ProducerTagControls {...baseProps} source="recorded" recordedState="recorded" />,
    );
    expect(html).toMatch(/re-record/i);
    expect(html).toMatch(/clear/i);
  });

  it("shows Recording… when recordedState is recording", () => {
    const html = renderToStaticMarkup(
      <ProducerTagControls {...baseProps} source="recorded" recordedState="recording" />,
    );
    expect(html).toMatch(/recording/i);
  });

  it("hides rate/pitch sliders when source is recorded", () => {
    const html = renderToStaticMarkup(
      <ProducerTagControls {...baseProps} source="recorded" recordedState="none" />,
    );
    expect(html).not.toContain('type="range"');
  });

  it("shows rate/pitch sliders when source is text", () => {
    const html = renderToStaticMarkup(<ProducerTagControls {...baseProps} source="text" />);
    expect(html).toContain('type="range"');
  });
});
