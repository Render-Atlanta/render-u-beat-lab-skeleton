import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LaneVoicePicker } from "./LaneVoicePicker";
import { SYNTH_VOICE_ID } from "../lib/laneVoiceSelection";

describe("LaneVoicePicker", () => {
  it("lists Synth first for the melody lane", () => {
    const html = renderToStaticMarkup(
      <LaneVoicePicker lane="melody" value={SYNTH_VOICE_ID} onChange={() => undefined} />,
    );
    expect(html).toContain('aria-label="Melody voice"');
    expect(html.indexOf("Synth")).toBeLessThan(html.indexOf("Grand Piano"));
  });
});
