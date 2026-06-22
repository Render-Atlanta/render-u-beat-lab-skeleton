// src/components/CommandBar.tsx
import { useState } from "react";

export interface CommandSuggestion {
  label: string;
  command: string;
}

export interface CommandBarProps {
  suggestions: CommandSuggestion[];
  statusMessage: string | null;
  onSubmit: (text: string) => void;
  onVoiceToggle?: () => void;
  voiceListening?: boolean;
  voiceMessage?: string | null;
  voiceSupported?: boolean;
}

export function CommandBar({
  suggestions,
  statusMessage,
  onSubmit,
  onVoiceToggle,
  voiceListening = false,
  voiceMessage = null,
  voiceSupported = false,
}: CommandBarProps) {
  const [text, setText] = useState("");
  const visibleStatus = voiceListening ? voiceMessage : statusMessage ?? voiceMessage;

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setText("");
  }

  return (
    <section className="command-bar" aria-label="Tell the beat what to do">
      <p className="eyebrow">Tell the beat what to do</p>
      <form
        className="command-bar__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(text);
        }}
      >
        <input
          className="command-bar__input"
          type="text"
          value={text}
          placeholder="e.g. make it bounce, slower, more swing"
          aria-label="Beat command"
          onChange={(event) => setText(event.target.value)}
        />
        <button className="star-button" type="submit">
          Go
        </button>
        {voiceSupported && onVoiceToggle ? (
          <button
            aria-label={voiceListening ? "Stop voice command" : "Start voice command"}
            aria-pressed={voiceListening}
            className="button secondary compact command-bar__voice"
            type="button"
            onClick={onVoiceToggle}
          >
            {voiceListening ? "Stop" : "Voice"}
          </button>
        ) : null}
      </form>
      <div className="command-bar__chips">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.command}
            type="button"
            className="button secondary compact"
            onClick={() => submit(suggestion.command)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <p className="command-bar__status" role="status" aria-live="polite">
        {visibleStatus ?? ""}
      </p>
    </section>
  );
}
