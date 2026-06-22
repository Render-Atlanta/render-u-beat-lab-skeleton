import { useState } from "react";
import {
  getInstrumentCoach,
  type PatternChangeSummary,
  type StyleCoachMetadata,
} from "../lib/beatCoach";
import type { AiBeatContext } from "../lib/aiBeatContext";
import { requestCoachAnswer } from "../lib/coachClient";
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
}

export function BeatCoachPanel({
  lesson,
  styleCoach,
  patternSummary,
  references,
  aiContext,
}: BeatCoachPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function askCoach() {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    try {
      const response = await requestCoachAnswer({
        question: trimmed,
        context: aiContext,
      });
      setAnswer(response.answer);
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
      <div className="coach-block">
        <p className="eyebrow">Pattern read</p>
        <p>{patternSummary.densitySummary}</p>
        <p>{patternSummary.pocketSummary}</p>
      </div>
      <div className="coach-block">
        <p className="eyebrow">Try this</p>
        <p>{patternSummary.tryThis}</p>
      </div>
      <div className="coach-block coach-qa">
        <p className="eyebrow">Ask the coach</p>
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
        {answer ? (
          <p className="coach-qa__answer" role="status">
            {answer}
          </p>
        ) : null}
      </div>
      <div className="reference-panel">
        <p className="eyebrow">Reference tracks</p>
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
