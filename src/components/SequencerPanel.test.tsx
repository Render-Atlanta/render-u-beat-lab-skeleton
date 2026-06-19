import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { INSTRUMENTS } from "../lib/instruments";
import { createDefaultLaneVolumes } from "../lib/laneVolumes";
import { createDefaultBassStepPitches, getInKeyPalette } from "../lib/stepPitch";
import { SequencerPanel } from "./SequencerPanel";

function noop() {}

function renderPanel(extra: Partial<Parameters<typeof SequencerPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <SequencerPanel
      styleName="Trap"
      activeSteps={4}
      bpm={140}
      swingPercent={0}
      audioEngineKind="web-audio"
      pattern={BEAT_STYLES.trap.pattern}
      laneVolumes={createDefaultLaneVolumes()}
      bassStepPitches={createDefaultBassStepPitches()}
      bassPalette={getInKeyPalette(BEAT_STYLES.trap.musicalKey)}
      activeStep={null}
      onBpmChange={noop}
      onSwingChange={noop}
      onAudioEngineKindChange={noop}
      onLaneVolumeChange={noop}
      onLaneVolumeReset={noop}
      onReset={noop}
      onToggleStep={noop}
      onBassStepPitchChange={noop}
      {...extra}
    />,
  );
}

describe("INSTRUMENTS metadata", () => {
  it("gives every lane a non-empty role and explainer", () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.role.trim().length).toBeGreaterThan(0);
      expect(instrument.explainer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("SequencerPanel role coaching", () => {
  it("renders each lane's role explainer text", () => {
    const html = renderPanel();
    for (const instrument of INSTRUMENTS) {
      expect(html).toContain(instrument.explainer);
    }
  });
});

describe("SequencerPanel lane count and new lanes", () => {
  it("renders exactly 6 instrument lanes", () => {
    expect(INSTRUMENTS).toHaveLength(6);
    const html = renderPanel();
    // Each track row contains the instrument label; count occurrences of track-label__name spans
    const matches = html.match(/track-label__name/g);
    expect(matches).toHaveLength(6);
  });

  it("renders the Clap lane label", () => {
    const html = renderPanel();
    expect(html).toContain("Clap");
  });

  it("renders the 808 lane label", () => {
    const html = renderPanel();
    expect(html).toContain("808");
  });

  it("renders a volume fader for each lane", () => {
    const html = renderPanel();
    const matches = html.match(/volume/gi);
    expect(matches?.length).toBeGreaterThanOrEqual(INSTRUMENTS.length);
  });
});

describe("SequencerPanel playhead", () => {
  it("marks the active step column", () => {
    const html = renderPanel({ activeStep: 0 });
    expect(html).toContain("playhead");
  });

  it("renders no playhead when activeStep is null", () => {
    const html = renderPanel({ activeStep: null });
    expect(html).not.toContain("playhead");
  });
});
