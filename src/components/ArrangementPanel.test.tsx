import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultArrangement } from "../lib/arrangement";
import { ArrangementPanel } from "./ArrangementPanel";

function noop() {}

function renderPanel(overrides: Partial<Parameters<typeof ArrangementPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <ArrangementPanel
      arrangement={createDefaultArrangement()}
      totalBars={4}
      durationSeconds={8}
      exportMessage=""
      projectJson=""
      playAsSong={false}
      playAsSongDisabled={false}
      nowPlaying={null}
      onSectionBarsChange={noop}
      onToggleLaneMute={noop}
      onTogglePlayAsSong={noop}
      onExportProject={noop}
      onDownloadWav={noop}
      onDownloadMidi={noop}
      {...overrides}
    />,
  );
}

describe("ArrangementPanel — Play as song", () => {
  it("renders the toggle off with the chain copy built from the section labels", () => {
    const html = renderPanel();
    expect(html).toContain("Play as song · Off");
    expect(html).toContain(
      "Chain Intro → Main → Variation → Outro with each section&#x27;s mutes.",
    );
  });

  it("reflects the on state via aria-checked and active class", () => {
    const html = renderPanel({ playAsSong: true });
    expect(html).toContain("Play as song · On");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("play-as-song__toggle active");
  });

  it("disables the toggle and shows the guided hint when guided owns masking", () => {
    const html = renderPanel({ playAsSongDisabled: true });
    expect(html).toContain("disabled");
    expect(html).toContain("Exit guided build to chain the arrangement as a song.");
  });

  it("keeps the now-playing indicator mounted but hidden when idle", () => {
    const html = renderPanel({ nowPlaying: null });
    expect(html).toContain("now-playing");
    expect(html).toContain("hidden");
  });

  it("surfaces the section · bar string while a song is playing", () => {
    const html = renderPanel({ playAsSong: true, nowPlaying: "Main · bar 2/4" });
    expect(html).toContain("▸ Now playing: ");
    expect(html).toContain("Main · bar 2/4");
  });
});
