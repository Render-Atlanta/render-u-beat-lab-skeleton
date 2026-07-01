import { useState } from "react";
import {
  getInstrumentCoach,
  type PatternChangeSummary,
  type StyleCoachMetadata,
} from "../lib/beatCoach";
import type { AiBeatContext } from "../lib/aiBeatContext";
import { requestCoachAnswer, type CoachClientResponse } from "../lib/coachClient";
import type { CommandAction } from "../lib/commandActions";
import { INSTRUMENTS } from "../lib/instruments";
import {
  formatStyleReferenceMeta,
  type StyleReferenceTrack,
} from "../lib/styleReferences";

export interface BeatCoachPanelProps {
  lesson: string;
  styleCoach: StyleCoachMetadata;
  patternSummary: PatternChangeSummary;
  references: StyleReferenceTrack[];
  aiContext: AiBeatContext;
  onApplyAction?: (action: CommandAction) => void;
}

const COACH_PROMPTS = [
  "What should I add next?",
  "Make this easier to dance to.",
  "How do I make the hats better?",
];

interface CoachExchange extends CoachClientResponse {
  question: string;
}

export function BeatCoachPanel({
  lesson,
  styleCoach,
  patternSummary,
  references,
  aiContext,
  onApplyAction,
}: BeatCoachPanelProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<CoachExchange[]>([]);
  const [busy, setBusy] = useState(false);
  const latest = history[0] ?? null;

  async function askCoach(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setQuestion(trimmed);
    try {
      const response = await requestCoachAnswer({
        question: trimmed,
        context: aiContext,
      });
      setHistory((current) => [{ question: trimmed, ...response }, ...current].slice(0, 4));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="panel-header">
        <p className="eyebrow">Beat coach</p>
        <h2 className="heading">{styleCoach.concept}</h2>
      </div>
      <p>{lesson}</p>
      <div className="coach-block coach-block--read">
        <p className="eyebrow">Pattern read</p>
        <p>{patternSummary.densitySummary}</p>
        <p>{patternSummary.pocketSummary}</p>
      </div>
      <div className="coach-block coach-block--try">
        <p className="eyebrow">Try this</p>
        <p>{patternSummary.tryThis}</p>
      </div>
      <div className="coach-block coach-qa">
        <p className="eyebrow">Ask the coach</p>
        <div className="coach-qa__prompts" aria-label="Coach prompts">
          {COACH_PROMPTS.map((prompt) => (
            <button
              className="button secondary compact"
              disabled={busy}
              key={prompt}
              onClick={() => void askCoach(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="coach-qa__form"
          onSubmit={(event) => {
            event.preventDefault();
            void askCoach();
          }}
        >
          <input
            aria-label="Beat coach question"
            disabled={busy}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should I add next?"
            value={question}
          />
          <button className="star-button" disabled={busy} type="submit">
            {busy ? "..." : "Ask"}
          </button>
        </form>
        {latest ? (
          <div className="coach-qa__answer" role="status">
            <p>{latest.answer}</p>
            {latest.action && onApplyAction ? (
              <button
                className="button compact"
                onClick={() => onApplyAction(latest.action as CommandAction)}
                type="button"
              >
                Apply
              </button>
            ) : null}
          </div>
        ) : null}
        {history.length > 1 ? (
          <div className="coach-qa__history">
            {history.slice(1).map((entry) => (
              <button
                className="coach-qa__history-item"
                key={`${entry.question}-${entry.answer}`}
                onClick={() => setQuestion(entry.question)}
                type="button"
              >
                {entry.question}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="reference-panel">
        <p className="eyebrow">Reference profiles</p>
        <div className="reference-list">
          {references.map((reference) => (
            <a
              className="reference-card"
              href={reference.sourceUrl}
              key={`${reference.artist}-${reference.title}`}
              rel="noreferrer"
              target="_blank"
            >
              <span>
                <strong>{reference.title}</strong>
                <small>{reference.artist}</small>
              </span>
              <span className="reference-meta">{formatStyleReferenceMeta(reference)}</span>
              <span>{reference.profile}</span>
            </a>
          ))}
        </div>
        <p className="reference-note">
          Metadata and listening notes only; presets are educational profiles,
          not copied drum parts.
        </p>
      </div>
      <div className="instrument-list">
        {INSTRUMENTS.map((instrument) => {
          const coach = getInstrumentCoach(instrument.id);
          return (
            <div className="instrument-card" key={instrument.id}>
              <strong>{coach.label}</strong>
              <span>{coach.role}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
