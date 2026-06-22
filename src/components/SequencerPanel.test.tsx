import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_SAMPLE_KIT_ID, SAMPLE_KIT_OPTIONS } from "../audio/sampleKit";
import { BEAT_STYLES } from "../lib/beatStyles";
import { INSTRUMENTS } from "../lib/instruments";
import { createDefaultLaneVolumes } from "../lib/laneVolumes";
import { createDefaultLaneMutes } from "../lib/laneMutes";
import { createDefaultStepVelocities } from "../lib/stepVelocity";
import { normalizeMixEffects } from "../lib/mixEffects";
import {
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
  getInKeyPalette,
  getMelodyPalette,
} from "../lib/stepPitch";
import {
  createDefaultBassGuitarStepPitches,
  getBassGuitarPalette,
} from "../lib/bassGuitarPitch";
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
      sampleKitId={DEFAULT_SAMPLE_KIT_ID}
      sampleKitOptions={SAMPLE_KIT_OPTIONS}
      pattern={BEAT_STYLES.trap.pattern}
      laneVolumes={createDefaultLaneVolumes()}
      laneMutes={createDefaultLaneMutes()}
      stepVelocities={createDefaultStepVelocities()}
      bassStepPitches={createDefaultBassStepPitches()}
      bassPalette={getInKeyPalette(BEAT_STYLES.trap.musicalKey)}
      bassGuitarStepPitches={createDefaultBassGuitarStepPitches()}
      bassGuitarPalette={getBassGuitarPalette(BEAT_STYLES.trap.musicalKey)}
      melodyStepPitches={createDefaultMelodyStepPitches()}
      melodyPalette={getMelodyPalette(BEAT_STYLES.trap.musicalKey)}
      activeStep={null}
      onBpmChange={noop}
      onTapTempo={noop}
      onSwingChange={noop}
      mixEffects={normalizeMixEffects()}
      onMixEffectsChange={noop}
      onAudioEngineKindChange={noop}
      onSampleKitChange={noop}
      onLaneVolumeChange={noop}
      onLaneVolumeReset={noop}
      onLaneMuteToggle={noop}
      onReset={noop}
      onClear={noop}
      canUndo={false}
      canRedo={false}
      onUndo={noop}
      onRedo={noop}
      onShare={noop}
      onMakeVariation={noop}
      onAddFill={noop}
      onHumanize={noop}
      countInEnabled={false}
      metronomeEnabled={false}
      onCountInToggle={noop}
      onMetronomeToggle={noop}
      onToggleStep={noop}
      onPaintStep={noop}
      onBassStepPitchChange={noop}
      onBassGuitarStepPitchChange={noop}
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
    expect(INSTRUMENTS).toHaveLength(8);
    const html = renderPanel();
    // Each track row contains the instrument label; count occurrences of track-label__name spans
    const matches = html.match(/track-label__name/g);
    expect(matches).toHaveLength(8);
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

describe("SequencerPanel control row", () => {
  it("wires Clear and Reset and leaves only the deferred controls inert", () => {
    const html = renderPanel();
    expect(html).toContain(">Clear</button>");
    expect(html).toContain(">Reset</button>");
    // Tap tempo is wired now; only Undo and Redo disable when history is empty.
    expect(html.match(/disabled/g)).toHaveLength(2);
  });

  it("renders dry mix effect controls by default", () => {
    const html = renderPanel();

    expect(html).toContain("Space 0%");
    expect(html).toContain("Echo 0%");
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

describe("SequencerPanel step velocity", () => {
  it("renders ghost and accent states for active drum cells", () => {
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[0] = 2;
    stepVelocities.hat[2] = 0;

    const html = renderPanel({ stepVelocities });

    expect(html).toContain("velocity-accent");
    expect(html).toContain("velocity-ghost");
    expect(html).toContain("Kick step 1 on, accent");
    expect(html).toContain("Hat step 3 on, ghost");
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

describe("SequencerPanel beat ruler", () => {
  it("renders four beat numbers 1-4 with none current when stopped", () => {
    const markup = renderPanel({ activeStep: null });
    expect(markup).toContain('aria-label="Beat ruler"');
    for (const n of ["1", "2", "3", "4"]) {
      expect(markup).toMatch(new RegExp(`beat-ruler__beat[^>]*>${n}<`));
    }
    expect(markup).not.toContain("is-current");
  });

  it("highlights the current beat from activeStep", () => {
    // activeStep 5 -> floor(5/4) = beat index 1 -> the "2" cell is current
    const markup = renderPanel({ activeStep: 5 });
    expect(markup).toMatch(/beat-ruler__beat[^>]*is-current[^>]*>2</);
    expect(markup).not.toMatch(/beat-ruler__beat[^>]*is-current[^>]*>1</);
  });
});
