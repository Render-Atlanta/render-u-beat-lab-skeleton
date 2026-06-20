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
}

export function CommandBar({ suggestions, statusMessage, onSubmit }: CommandBarProps) {
  const [text, setText] = useState("");

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setText("");
  }

  return (
    <section className="panel command-bar" aria-label="Tell the beat what to do">
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
        {statusMessage ?? ""}
      </p>
    </section>
  );
}
