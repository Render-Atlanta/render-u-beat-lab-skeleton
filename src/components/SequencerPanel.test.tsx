import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { INSTRUMENTS } from "../lib/instruments";
import { createDefaultLaneVolumes } from "../lib/laneVolumes";
import {
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
  getInKeyPalette,
  getMelodyPalette,
} from "../lib/stepPitch";
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
      melodyStepPitches={createDefaultMelodyStepPitches()}
      melodyPalette={getMelodyPalette(BEAT_STYLES.trap.musicalKey)}
      activeStep={null}
      onBpmChange={noop}
      onSwingChange={noop}
      onAudioEngineKindChange={noop}
      onLaneVolumeChange={noop}
      onLaneVolumeReset={noop}
      onReset={noop}
      onToggleStep={noop}
      onBassStepPitchChange={noop}
      onMelodyStepPitchChange={noop}
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
  it("renders exactly 7 instrument lanes", () => {
    expect(INSTRUMENTS).toHaveLength(7);
    const html = renderPanel();
    // Each track row contains the instrument label; count occurrences of track-label__name spans
    const matches = html.match(/track-label__name/g);
    expect(matches).toHaveLength(7);
  });

  it("renders the Clap lane label", () => {
    const html = renderPanel();
    expect(html).toContain("Clap");
  });

  it("renders the 808 lane label", () => {
    const html = renderPanel();
    expect(html).toContain("808");
  });

  it("renders the Melody lane label", () => {
    const html = renderPanel();
    expect(html).toContain("Melody");
  });

  it("renders a volume fader for each lane", () => {
    const html = renderPanel();
    const matches = html.match(/volume/gi);
    expect(matches?.length).toBeGreaterThanOrEqual(INSTRUMENTS.length);
  });
});

describe("SequencerPanel melody pitch controls", () => {
  it("shows an in-key note selector for active melody steps", () => {
    const html = renderPanel({
      pattern: {
        ...BEAT_STYLES.trap.pattern,
        melody: [true, ...Array.from({ length: 15 }, () => false)],
      },
    });

    expect(html).toContain("Melody step 1 note");
    expect(html).toContain("pitch-root");
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

describe("SequencerPanel guided filtering", () => {
  it("renders every lane when visibleInstruments is omitted", () => {
    const html = renderPanel();
    for (const instrument of INSTRUMENTS) {
      expect(html).toContain(`>${instrument.label}</span>`);
    }
  });

  it("renders only the lanes passed in visibleInstruments", () => {
    const visible = INSTRUMENTS.filter((instrument) =>
      ["kick", "snare"].includes(instrument.id),
    );
    const html = renderPanel({ visibleInstruments: visible });

    expect(html).toContain(">Kick</span>");
    expect(html).toContain(">Snare</span>");
    expect(html).not.toContain(">Hat</span>");
    expect(html).not.toContain(">808</span>");
    expect(html).not.toContain(">Melody</span>");
  });
});
