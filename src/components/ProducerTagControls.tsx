import type { ProducerTagConfig, ProducerTagTrigger } from "../lib/producerTag";

export interface ProducerTagControlsProps {
  config: ProducerTagConfig;
  text: string;
  enabled: boolean;
  trigger: ProducerTagTrigger;
  rate: number;
  pitch: number;
  onTextChange: (text: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  onTriggerChange: (trigger: ProducerTagTrigger) => void;
  onRateChange: (rate: number) => void;
  onPitchChange: (pitch: number) => void;
}

export function ProducerTagControls({
  config,
  text,
  enabled,
  trigger,
  rate,
  pitch,
  onTextChange,
  onEnabledChange,
  onTriggerChange,
  onRateChange,
  onPitchChange,
}: ProducerTagControlsProps) {
  return (
    <>
      <label className="tag-field">
        <span className="eyebrow">Producer tag</span>
        <input
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          maxLength={48}
        />
      </label>
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
            onChange={(event) => onTriggerChange(event.target.value as ProducerTagTrigger)}
          >
            <option value="manual">Manual</option>
            <option value="intro">Intro</option>
          </select>
        </label>
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
      </div>
    </>
  );
}
