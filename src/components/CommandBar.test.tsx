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
    expect(html).toContain("AI checking");
  });

  it("renders configured AI setup status", () => {
    const html = renderToStaticMarkup(
      <CommandBar
        suggestions={suggestions}
        statusMessage={null}
        onSubmit={noop}
        aiHealth={{ status: "ready", provider: "gemini", requestId: "req-1" }}
      />,
    );

    expect(html).toContain("AI ready: gemini");
  });

  it("renders missing AI setup status", () => {
    const html = renderToStaticMarkup(
      <CommandBar
        suggestions={suggestions}
        statusMessage={null}
        onSubmit={noop}
        aiHealth={{ status: "missing", provider: "openai", requestId: "req-2" }}
      />,
    );

    expect(html).toContain("AI needs key");
  });

  it("renders the status message when present", () => {
    const html = renderToStaticMarkup(
      <CommandBar suggestions={suggestions} statusMessage="Slowed the tempo down." onSubmit={noop} />,
    );
    expect(html).toContain("Slowed the tempo down.");
  });

  it("hides voice controls when speech input is unsupported", () => {
    const html = renderToStaticMarkup(
      <CommandBar
        suggestions={suggestions}
        statusMessage={null}
        onSubmit={noop}
        voiceSupported={false}
        onVoiceToggle={noop}
      />,
    );

    expect(html).not.toContain("Start voice command");
  });

  it("renders the voice control and listening status when supported", () => {
    const html = renderToStaticMarkup(
      <CommandBar
        suggestions={suggestions}
        statusMessage={null}
        onSubmit={noop}
        voiceSupported
        voiceListening
        voiceMessage="Listening..."
        onVoiceToggle={noop}
      />,
    );

    expect(html).toContain("Stop voice command");
    expect(html).toContain("Listening...");
  });

  it("renders a busy state while an AI command is pending", () => {
    const html = renderToStaticMarkup(
      <CommandBar
        suggestions={suggestions}
        statusMessage="Asking the beat coach..."
        onSubmit={noop}
        busy
      />,
    );

    expect(html).toContain("disabled");
    expect(html).toContain("Asking the beat coach...");
  });
});
