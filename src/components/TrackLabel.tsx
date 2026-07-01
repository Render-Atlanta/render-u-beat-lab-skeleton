import type { InstrumentOption } from "../lib/instruments";
import { DEFAULT_LANE_VOLUME } from "../lib/laneVolumes";

export interface TrackLabelProps {
  instrument: InstrumentOption;
  muted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onVolumeReset: () => void;
}

/** Lane header: name/role/explainer, the mute toggle, and the volume control. */
export function TrackLabel({
  instrument,
  muted,
  volume,
  onMuteToggle,
  onVolumeChange,
  onVolumeReset,
}: TrackLabelProps) {
  return (
    <div className="track-label-block">
      <div className="track-label">
        <span className="track-label__name">{instrument.label}</span>
        <span className="track-label__role">{instrument.role}</span>
        <span className="track-label__explainer">{instrument.explainer}</span>
      </div>
      <button
        className={`button secondary compact track-mute${muted ? " active" : ""}`}
        type="button"
        aria-pressed={muted}
        aria-label={`${muted ? "Unmute" : "Mute"} ${instrument.label} lane`}
        onClick={onMuteToggle}
      >
        {muted ? "Muted" : "Mute"}
      </button>
      <div className="track-volume">
        <label className="track-volume__control">
          <span className="eyebrow">{instrument.label} volume</span>
          <input
            type="range"
            min="0"
            max="150"
            step="1"
            value={Math.round(volume * 100)}
            aria-label={`${instrument.label} volume`}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
        {volume !== DEFAULT_LANE_VOLUME ? (
          <button
            className="button secondary compact track-volume__reset"
            type="button"
            aria-label={`Reset ${instrument.label} volume`}
            onClick={onVolumeReset}
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
