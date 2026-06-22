// src/components/CommandBar.tsx
import { useState } from "react";
import type { AiHealthState } from "../lib/aiHealthClient";

export interface CommandSuggestion {
  label: string;
  command: string;
}

export interface CommandBarProps {
  suggestions: CommandSuggestion[];
  statusMessage: string | null;
  onSubmit: (text: string) => void;
  busy?: boolean;
  aiHealth?: AiHealthState;
  onVoiceToggle?: () => void;
  voiceListening?: boolean;
  voiceMessage?: string | null;
  voiceSupported?: boolean;
}

export function CommandBar({
  suggestions,
  statusMessage,
  onSubmit,
  busy = false,
  aiHealth = { status: "checking" },
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
      <div className="command-bar__meta">
        <p className="eyebrow">Tell the beat what to do</p>
        <AiStatusPill health={aiHealth} />
      </div>
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
          disabled={busy}
          placeholder="e.g. make it bounce, slower, more swing"
          aria-label="Beat command"
          onChange={(event) => setText(event.target.value)}
        />
        <button className="star-button" type="submit" disabled={busy}>
          {busy ? "..." : "Go"}
        </button>
        {voiceSupported && onVoiceToggle ? (
          <button
            aria-label={voiceListening ? "Stop voice command" : "Start voice command"}
            aria-pressed={voiceListening}
            className="button secondary compact command-bar__voice"
            type="button"
            disabled={busy}
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
            disabled={busy}
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

function AiStatusPill({ health }: { health: AiHealthState }) {
  const copy = getAiStatusCopy(health);
  return (
    <span
      className={`ai-status-pill ${copy.tone}`}
      title={copy.title}
    >
      {copy.label}
    </span>
  );
}

function getAiStatusCopy(health: AiHealthState): {
  label: string;
  title: string;
  tone: "checking" | "ready" | "missing" | "error";
} {
  switch (health.status) {
    case "checking":
      return {
        label: "AI checking",
        title: "Checking AI provider setup",
        tone: "checking",
      };
    case "ready":
      return {
        label: `AI ready: ${health.provider}`,
        title: `AI provider configured. Request ${health.requestId}`,
        tone: "ready",
      };
    case "missing":
      return {
        label: "AI needs key",
        title: `${health.provider} is selected but not configured. Request ${health.requestId}`,
        tone: "missing",
      };
    case "error":
      return {
        label: "AI offline",
        title: "AI setup status could not be checked",
        tone: "error",
      };
  }
}
