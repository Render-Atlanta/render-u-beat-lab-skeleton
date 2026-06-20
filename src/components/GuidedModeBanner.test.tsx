import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INSTRUMENTS } from "../lib/instruments";
import { GuidedModeBanner } from "./GuidedModeBanner";

function noop() {}

const kick = INSTRUMENTS[0];
const melody = INSTRUMENTS[INSTRUMENTS.length - 1];

describe("GuidedModeBanner", () => {
  it("shows the current step number, label, role, and explainer", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={0}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onPrevious={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );

    expect(html).toContain(`Step 1 of ${INSTRUMENTS.length}`);
    expect(html).toContain(kick.label);
    expect(html).toContain(kick.role);
    expect(html).toContain(kick.explainer);
  });

  it("labels the advance button 'Next layer' on a middle step", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={0}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onPrevious={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Next layer");
    expect(html).not.toContain("Finish");
  });

  it("labels the advance button 'Finish' on the last step", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={melody}
        stepIndex={INSTRUMENTS.length - 1}
        stepCount={INSTRUMENTS.length}
        isLastStep
        onNext={noop}
        onPrevious={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Finish");
    expect(html).not.toContain("Next layer");
  });

  it("shows the guided tip and the earlier-layers coaching line", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={1}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onPrevious={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain(kick.guidedTip);
    expect(html).toContain("Earlier layers stay live");
    expect(html).toContain("Previous layer");
  });

  it("disables Previous on the first step", () => {
    const html = renderToStaticMarkup(
      <GuidedModeBanner
        instrument={kick}
        stepIndex={0}
        stepCount={INSTRUMENTS.length}
        isLastStep={false}
        onNext={noop}
        onPrevious={noop}
        onSkip={noop}
        onExit={noop}
      />,
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Previous layer/);
  });
});
