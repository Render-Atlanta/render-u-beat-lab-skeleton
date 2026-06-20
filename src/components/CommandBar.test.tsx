// src/components/CommandBar.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandBar, type CommandSuggestion } from "./CommandBar";

function noop() {}

const suggestions: CommandSuggestion[] = [
  { label: "Make it bounce", command: "make it bounce" },
  { label: "Slower", command: "slower" },
];

describe("CommandBar", () => {
  it("renders the input, suggestion chips, and the section label", () => {
    const html = renderToStaticMarkup(
      <CommandBar suggestions={suggestions} statusMessage={null} onSubmit={noop} />,
    );
    expect(html).toContain("Tell the beat what to do");
    expect(html).toContain("Make it bounce");
    expect(html).toContain("Slower");
  });

  it("renders the status message when present", () => {
    const html = renderToStaticMarkup(
      <CommandBar suggestions={suggestions} statusMessage="Slowed the tempo down." onSubmit={noop} />,
    );
    expect(html).toContain("Slowed the tempo down.");
  });
});
