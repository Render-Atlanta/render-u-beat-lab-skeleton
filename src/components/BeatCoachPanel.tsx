import {
  getInstrumentCoach,
  type PatternChangeSummary,
  type StyleCoachMetadata,
} from "../lib/beatCoach";
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
}

export function BeatCoachPanel({
  lesson,
  styleCoach,
  patternSummary,
  references,
}: BeatCoachPanelProps) {
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
