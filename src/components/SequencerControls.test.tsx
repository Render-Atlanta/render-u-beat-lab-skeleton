import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SequencerControls } from "./SequencerControls";

function noop() {}

function renderControls(
  extra: Partial<Parameters<typeof SequencerControls>[0]> = {},
) {
  return renderToStaticMarkup(
    <SequencerControls
      bpm={140}
      swingPercent={0}
      audioEngineKind="web-audio"
      canUndo={false}
      canRedo={false}
      onBpmChange={noop}
      onSwingChange={noop}
      onAudioEngineKindChange={noop}
      onUndo={noop}
      onRedo={noop}
      onClear={noop}
      onReset={noop}
      onShare={noop}
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
    expect(empty.match(/disabled=""/g)).toHaveLength(3);
    expect(ready.match(/disabled=""/g)).toHaveLength(1);
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
});
