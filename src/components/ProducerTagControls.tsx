import type {
  ProducerTagConfig,
  ProducerTagSource,
  ProducerTagTrigger,
} from "../lib/producerTag";

export type RecordedState = "none" | "recording" | "recorded";

export interface ProducerTagControlsProps {
  config: ProducerTagConfig;
  text: string;
  enabled: boolean;
  trigger: ProducerTagTrigger;
  rate: number;
  pitch: number;
  source: ProducerTagSource;
  recordedState: RecordedState;
  onTextChange: (text: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  onTriggerChange: (trigger: ProducerTagTrigger) => void;
  onRateChange: (rate: number) => void;
  onPitchChange: (pitch: number) => void;
  onSourceChange: (source: ProducerTagSource) => void;
  onRecord: () => void;
  onClearRecording: () => void;
}

export function ProducerTagControls({
  config,
  text,
  enabled,
  trigger,
  rate,
  pitch,
  source,
  recordedState,
  onTextChange,
  onEnabledChange,
  onTriggerChange,
  onRateChange,
  onPitchChange,
  onSourceChange,
  onRecord,
  onClearRecording,
}: ProducerTagControlsProps) {
  return (
    <>
      <div className="tag-source-toggle">
        <button
          className={`tag-source-btn ${source === "text" ? "active" : ""}`}
          type="button"
          aria-pressed={source === "text"}
          onClick={() => onSourceChange("text")}
        >
          Type
        </button>
        <button
          className={`tag-source-btn ${source === "recorded" ? "active" : ""}`}
          type="button"
          aria-pressed={source === "recorded"}
          onClick={() => onSourceChange("recorded")}
        >
          Record
        </button>
      </div>

      {source === "text" ? (
        <label className="tag-field">
          <span className="eyebrow">Producer tag</span>
          <input
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            maxLength={48}
          />
        </label>
      ) : (
        <div className="tag-record-controls">
          {recordedState === "none" && (
            <button
              className="button secondary compact"
              type="button"
              onClick={onRecord}
            >
              Record (3 s)
            </button>
          )}
          {recordedState === "recording" && (
            <span className="tag-recording-status">Recording…</span>
          )}
          {recordedState === "recorded" && (
            <div className="tag-recorded-actions">
              <button
                className="button secondary compact"
                type="button"
                onClick={onRecord}
              >
                Re-record
              </button>
              <button
                className="button secondary compact"
                type="button"
                onClick={onClearRecording}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      <div className="tag-controls">
        <label className="check-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          <span>Tag on</span>
        </label>
        <label className="control-field">
          <span className="eyebrow">Trigger</span>
          <select
            value={trigger}
            onChange={(event) =>
              onTriggerChange(event.target.value as ProducerTagTrigger)
            }
          >
            <option value="manual">Manual</option>
            <option value="intro">Intro</option>
            <option value="loop">Loop</option>
          </select>
        </label>
        {source === "text" && (
          <>
            <label className="control-field">
              <span className="eyebrow">Rate {config.effects.rate.toFixed(2)}</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={rate}
                onChange={(event) => onRateChange(Number(event.target.value))}
              />
            </label>
            <label className="control-field">
              <span className="eyebrow">Pitch {config.effects.pitch.toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={pitch}
                onChange={(event) => onPitchChange(Number(event.target.value))}
              />
            </label>
          </>
        )}
      </div>
    </>
  );
}
