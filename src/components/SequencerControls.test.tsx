import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SAMPLE_KIT_ID, SAMPLE_KIT_OPTIONS } from "../audio/sampleKit";
import { normalizeMixEffects } from "../lib/mixEffects";
import { SequencerControls } from "./SequencerControls";

function noop() {}

function renderControls(
  extra: Partial<Parameters<typeof SequencerControls>[0]> = {},
) {
  return renderToStaticMarkup(
    <SequencerControls
      bpm={140}
      swingPercent={0}
      mixEffects={normalizeMixEffects()}
      audioEngineKind="web-audio"
      sampleKitId={DEFAULT_SAMPLE_KIT_ID}
      sampleKitOptions={SAMPLE_KIT_OPTIONS}
      canUndo={false}
      canRedo={false}
      onBpmChange={noop}
      onTapTempo={noop}
      onSwingChange={noop}
      onMixEffectsChange={noop}
      onAudioEngineKindChange={noop}
      onSampleKitChange={noop}
      onUndo={noop}
      onRedo={noop}
      onClear={noop}
      onReset={noop}
      onShare={noop}
      onMakeVariation={noop}
      onAddFill={noop}
      onHumanize={noop}
      countInEnabled={false}
      metronomeEnabled={false}
      onCountInToggle={noop}
      onMetronomeToggle={noop}
      {...extra}
    />,
  );
}

describe("SequencerControls history and share buttons", () => {
  it("disables undo and redo only when their stacks are empty", () => {
    const empty = renderControls({ canUndo: false, canRedo: false });
    const ready = renderControls({ canUndo: true, canRedo: true });

    expect(empty).toContain('aria-label="Undo"');
    expect(empty).toContain('aria-label="Redo"');
    // Only Undo and Redo can disable now that Tap tempo is wired and active.
    expect(empty.match(/disabled=""/g)).toHaveLength(2);
    expect(ready).not.toContain('disabled=""');
  });

  it("renders an active Tap tempo button", () => {
    const html = renderControls();

    expect(html).toContain(">Tap</button>");
    expect(html).not.toContain('title="Tap tempo arrives in a follow-up update"');
  });

  it("renders active count-in and metronome toggles", () => {
    const html = renderControls({ countInEnabled: true, metronomeEnabled: true });

    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain(">Count-in</button>");
    expect(html).toContain(">Metronome</button>");
  });

  it("renders a share link action", () => {
    const html = renderControls();

    expect(html).toContain(">Share link</button>");
  });

  it("renders selectable sample kits", () => {
    const html = renderControls();

    expect(html).toContain(">Classic</option>");
    expect(html).toContain(">Punchy</option>");
    expect(html).toContain(">Airy</option>");
  });
});
