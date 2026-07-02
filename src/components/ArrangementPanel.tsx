import {
  ARRANGEMENT_MAX_BARS,
  ARRANGEMENT_MIN_BARS,
  isLaneMutedInSection,
  type Arrangement,
  type ArrangementSectionId,
} from "../lib/arrangement";
import { INSTRUMENTS } from "../lib/instruments";
import type { InstrumentId } from "../lib/patterns";

export interface ArrangementPanelProps {
  arrangement: Arrangement;
  totalBars: number;
  durationSeconds: number;
  exportMessage: string;
  projectJson: string;
  playAsSong: boolean;
  /** Disabled (with a hint) while guided mode owns the lane masking. */
  playAsSongDisabled: boolean;
  /** The "{Section · bar N/total}" string while a song is playing, else null. */
  nowPlaying: string | null;
  onSectionBarsChange: (
    sectionId: ArrangementSectionId,
    bars: number,
  ) => void;
  onToggleLaneMute: (
    sectionId: ArrangementSectionId,
    instrument: InstrumentId,
  ) => void;
  onTogglePlayAsSong: () => void;
  onExportProject: () => void;
  onDownloadWav: () => void;
  /** Disables the WAV buttons while an async export is in flight. */
  wavExportDisabled?: boolean;
  onDownloadMidi: () => void;
}

export function ArrangementPanel({
  arrangement,
  totalBars,
  durationSeconds,
  exportMessage,
  projectJson,
  playAsSong,
  playAsSongDisabled,
  nowPlaying,
  onSectionBarsChange,
  onToggleLaneMute,
  onTogglePlayAsSong,
  onExportProject,
  onDownloadWav,
  wavExportDisabled = false,
  onDownloadMidi,
}: ArrangementPanelProps) {
  // Build the chain copy from the live section labels so it never drifts from
  // what the panel actually renders below.
  const chainLabels = arrangement.sections.map((section) => section.label).join(" → ");

  return (
    <div className="arrangement-panel">
      <div className="arrangement-head">
        <div>
          <p className="eyebrow">Arrangement</p>
          <h3 className="heading">Build the song</h3>
          <strong>{totalBars} bars</strong>
          <span>{durationSeconds.toFixed(1)} sec</span>
        </div>
        <div className="export-actions arrangement-head__actions">
          <button className="button secondary compact" type="button" onClick={onExportProject}>
            Export JSON
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onDownloadWav}
            disabled={wavExportDisabled}
          >
            WAV
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onDownloadMidi}
          >
            MIDI
          </button>
        </div>
      </div>
      <div className="play-as-song">
        <div className="play-as-song__row">
          <button
            type="button"
            role="switch"
            aria-checked={playAsSong}
            className={`play-as-song__toggle ${playAsSong ? "active" : ""}`}
            disabled={playAsSongDisabled}
            onClick={onTogglePlayAsSong}
          >
            Play as song · {playAsSong ? "On" : "Off"}
          </button>
        </div>
        <p className="play-as-song__hint">
          {playAsSongDisabled
            ? "Exit guided build to chain the arrangement as a song."
            : `Chain ${chainLabels} with each section's mutes.`}
        </p>
        {/* Kept mounted (hidden when idle) so SSR snapshots see the indicator. */}
        <p className="now-playing" aria-live="polite" hidden={!nowPlaying}>
          ▸ Now playing: {nowPlaying ?? ""}
        </p>
      </div>
      <div className="arrangement-grid">
        {arrangement.sections.map((section) => (
          <div className="arrangement-section" key={section.id}>
            <div className="arrangement-section__top">
              <strong>{section.label}</strong>
              <label className="bar-count-field">
                <span className="eyebrow">Bars</span>
                <input
                  type="number"
                  min={ARRANGEMENT_MIN_BARS}
                  max={ARRANGEMENT_MAX_BARS}
                  value={section.bars}
                  onChange={(event) =>
                    onSectionBarsChange(section.id, Number(event.target.value))
                  }
                />
              </label>
            </div>
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
          disabled={wavExportDisabled}
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
