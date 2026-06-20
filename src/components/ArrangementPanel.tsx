import {
  isLaneMutedInSection,
  type Arrangement,
  type ArrangementSectionId,
} from "../lib/arrangement";
import { INSTRUMENTS } from "../lib/instruments";
import type { InstrumentId } from "../lib/patterns";

export interface ArrangementPanelProps {
  arrangement: Arrangement;
  exportMessage: string;
  projectJson: string;
  onToggleLaneMute: (
    sectionId: ArrangementSectionId,
    instrument: InstrumentId,
  ) => void;
  onExportProject: () => void;
  onDownloadWav: () => void;
  onDownloadMidi: () => void;
}

export function ArrangementPanel({
  arrangement,
  exportMessage,
  projectJson,
  onToggleLaneMute,
  onExportProject,
  onDownloadWav,
  onDownloadMidi,
}: ArrangementPanelProps) {
  return (
    <div className="arrangement-panel">
      <p className="eyebrow">Arrangement</p>
      <div className="arrangement-grid">
        {arrangement.sections.map((section) => (
          <div className="arrangement-section" key={section.id}>
            <strong>{section.label}</strong>
            <span>{section.bars} bar</span>
            <div className="lane-mutes" aria-label={`${section.label} lane mutes`}>
              {INSTRUMENTS.map((instrument) => {
                const muted = isLaneMutedInSection(
                  arrangement,
                  section.id,
                  instrument.id,
                );

                return (
                  <button
                    className={`lane-mute ${muted ? "muted" : ""}`}
                    key={`${section.id}-${instrument.id}`}
                    type="button"
                    aria-pressed={muted}
                    onClick={() => onToggleLaneMute(section.id, instrument.id)}
                  >
                    {instrument.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="export-actions">
        <button className="button secondary compact" type="button" onClick={onExportProject}>
          Export JSON
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onDownloadWav}
        >
          Download WAV
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onDownloadMidi}
        >
          Download MIDI
        </button>
      </div>
      {exportMessage ? <p className="status-copy">{exportMessage}</p> : null}
      {projectJson ? (
        <textarea
          className="project-json"
          readOnly
          value={projectJson}
          aria-label="Exported project JSON"
        />
      ) : null}
    </div>
  );
}
