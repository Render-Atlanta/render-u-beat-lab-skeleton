import { useState } from "react";
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

const TRIGGERS: { id: ProducerTagTrigger; label: string; desc: string }[] = [
  { id: "manual", label: "Manual", desc: "Only when you hit the Tag button." },
  { id: "intro", label: "Intro drop", desc: "Plays once when the beat starts." },
  {
    id: "loop",
    label: "Every loop",
    desc: "Drops at the top of each 16-step loop.",
  },
];

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
  // Two-step wizard (brief): "Make it" then "Place it".
  const [step, setStep] = useState<1 | 2>(1);

  const previewText =
    source === "recorded"
      ? recordedState === "recorded"
        ? "🎙 Recorded tag"
        : "Record your voice…"
      : text.trim() || "Your tag here";

  return (
    <div className="tag-wizard">
      <ol className="tag-steps" aria-label="Tag steps">
        <li className={`tag-step-dot ${step === 1 ? "active" : ""}`}>
          <span aria-hidden="true">1</span>
          Make it
        </li>
        <span className="tag-steps__arrow" aria-hidden="true">
          →
        </span>
        <li className={`tag-step-dot ${step === 2 ? "active" : ""}`}>
          <span aria-hidden="true">2</span>
          Place it
        </li>
      </ol>

      <div className="tag-preview">
        <span className="tag-preview__icon" aria-hidden="true">
          ♪
        </span>
        <span>
          <span className="eyebrow">Your tag</span>
          <strong>{previewText}</strong>
        </span>
      </div>

      <div className="tag-step" data-active={step === 1}>
        <h3 className="heading">Make it</h3>
          <div className="tag-source-toggle">
            <button
              className={`tag-source-btn ${source === "text" ? "active" : ""}`}
              type="button"
              aria-pressed={source === "text"}
              onClick={() => onSourceChange("text")}
            >
              Type it
            </button>
            <button
              className={`tag-source-btn ${source === "recorded" ? "active" : ""}`}
              type="button"
              aria-pressed={source === "recorded"}
              onClick={() => onSourceChange("recorded")}
            >
              Record it
            </button>
          </div>

          {source === "text" ? (
            <>
              <label className="tag-field">
                <span className="eyebrow">Say your name / phrase</span>
                <input
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  maxLength={48}
                />
              </label>
              <label className="control-field wide">
                <span className="eyebrow">
                  Speed {config.effects.rate.toFixed(2)}×
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={rate}
                  onChange={(event) => onRateChange(Number(event.target.value))}
                />
              </label>
              <label className="control-field wide">
                <span className="eyebrow">
                  Pitch {config.effects.pitch.toFixed(2)}×
                </span>
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
          ) : (
            <div className="tag-record-controls">
              {recordedState === "none" && (
                <button
                  className="button compact tag-record-btn"
                  type="button"
                  onClick={onRecord}
                >
                  <span className="tag-record-dot" aria-hidden="true" />
                  Record (3 s)
                </button>
              )}
              {recordedState === "recording" && (
                <span className="tag-recording-status bx-rec">Recording…</span>
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

          <button
            className="star-button tag-next"
            type="button"
            onClick={() => setStep(2)}
          >
            Next · place it →
          </button>
        </div>
      <div className="tag-step" data-active={step === 2}>
          <h3 className="heading">Place it</h3>
          <p className="eyebrow">When does it drop?</p>
          <div className="trigger-cards" role="group" aria-label="Tag trigger">
            {TRIGGERS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-trigger={option.id}
                className={`trigger-card ${trigger === option.id ? "active" : ""}`}
                aria-pressed={trigger === option.id}
                onClick={() => onTriggerChange(option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.desc}</span>
              </button>
            ))}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
            <span>Tag on in the beat</span>
          </label>
          <button
            className="button secondary compact tag-back"
            type="button"
            onClick={() => setStep(1)}
          >
            ← Back
          </button>
        </div>
    </div>
  );
}
