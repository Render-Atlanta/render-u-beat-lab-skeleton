import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAT_STYLES } from "../lib/beatStyles";
import { getBassGuitarPalette } from "../lib/bassGuitarPitch";
import { getInKeyPalette, getMelodyPalette } from "../lib/stepPitch";
import { PianoRollPanel, type PianoRollLane } from "./PianoRollPanel";

const KEY = BEAT_STYLES.trap.musicalKey;

function steps(onIndices: number[]): boolean[] {
  return Array.from({ length: 16 }, (_, index) => onIndices.includes(index));
}

function pitches(map: Record<number, number>): number[] {
  return Array.from({ length: 16 }, (_, index) => map[index] ?? 0);
}

function makeLanes(): PianoRollLane[] {
  return [
    {
      id: "808",
      label: "808",
      steps: steps([]),
      pitches: pitches({}),
      palette: getInKeyPalette(KEY),
    },
    {
      id: "bassGuitar",
      label: "Bass Gtr",
      steps: steps([]),
      pitches: pitches({}),
      palette: getBassGuitarPalette(KEY),
    },
    {
      id: "melody",
      label: "Melody",
      steps: steps([0]),
      pitches: pitches({ 0: 0 }),
      palette: getMelodyPalette(KEY),
    },
  ];
}

function render(extra: Partial<Parameters<typeof PianoRollPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <PianoRollPanel
      lanes={makeLanes()}
      musicalKey={KEY}
      activeStep={null}
      activePitchedSteps={1}
      onTranspose={() => {}}
      onResetPitches={() => {}}
      onSetNote={() => {}}
      onClearStep={() => {}}
      {...extra}
    />,
  );
}

describe("PianoRollPanel", () => {
  it("renders a 7-row by 16-step grid for the focused lane", () => {
    const html = render();
    expect(html.match(/class="pr-row"/g)).toHaveLength(7);
    // Each cell is a native toggle button carrying the pr-cell class.
    expect(html.match(/pr-cell/g)).toHaveLength(7 * 16);
  });

  it("defaults to the melody lane", () => {
    const html = render();
    expect(html).toContain('aria-label="Melody notes"');
  });

  it("renders key scale tones and pitch action controls", () => {
    const html = render();

    expect(html).toContain('aria-label="A minor scale"');
    expect(html).toContain(">A minor</strong>");
    expect(html).toContain(">Down</button>");
    expect(html).toContain(">Up</button>");
    expect(html).toContain(">Root notes</button>");
  });

  it("offers a button for every pitched lane", () => {
    const html = render();
    expect(html).toContain(">808<");
    expect(html).toContain(">Bass Gtr<");
    expect(html).toContain(">Melody<");
  });

  it("marks an active note with its harmonic colour", () => {
    const html = render();
    // Melody step 1 is on at the root (degree 0).
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("pitch-root");
    expect(html).toContain(
      'aria-label="Melody, note 1, step 1 on"',
    );
  });

  it("can focus a specific lane via initialLaneId", () => {
    const html = render({ initialLaneId: "808" });
    expect(html).toContain('aria-label="808 notes"');
  });

  it("disables pitch actions when there are no active pitched steps", () => {
    const html = render({ activePitchedSteps: 0 });
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
