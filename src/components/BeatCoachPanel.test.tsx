import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BeatCoachPanel } from "./BeatCoachPanel";
import { getStyleCoach, summarizePatternChange } from "../lib/beatCoach";
import { BEAT_STYLES } from "../lib/beatStyles";
import { createAiBeatContext } from "../lib/aiBeatContext";
import { createDefaultSequencerState } from "../lib/patternState";

const sequencer = createDefaultSequencerState("trap");

describe("BeatCoachPanel", () => {
  it("renders the AI coach question form with grounded static coaching", () => {
    const html = renderToStaticMarkup(
      <BeatCoachPanel
        lesson={BEAT_STYLES.trap.lesson}
        styleCoach={getStyleCoach("trap")}
        patternSummary={summarizePatternChange("trap", sequencer.pattern)}
        references={[]}
        aiContext={createAiBeatContext(sequencer)}
      />,
    );

    expect(html).toContain("Ask the coach");
    expect(html).toContain("What should I add next?");
    expect(html).toContain("Make this easier to dance to.");
    expect(html).toContain("Pattern read");
  });
});
