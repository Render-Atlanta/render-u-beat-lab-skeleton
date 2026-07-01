import { useState } from "react";
import type { AudioEngineKind } from "../audio/audioEngine";
import type { SampleKitId, SampleKitOption } from "../audio/sampleKit";
import type { MixEffects } from "../lib/mixEffects";
import type { LaneVoiceId, LaneVoiceSelection, VoicedLane } from "../lib/laneVoiceSelection";
import { VOICED_LANES } from "../lib/laneVoiceSelection";
import { LaneVoicePicker } from "./LaneVoicePicker";

export interface SequencerControlsProps {
  bpm: number;
  swingPercent: number;
  mixEffects: MixEffects;
  audioEngineKind: AudioEngineKind;
  sampleKitId: SampleKitId;
  sampleKitOptions: readonly SampleKitOption[];
  laneVoices: LaneVoiceSelection;
  canUndo: boolean;
  canRedo: boolean;
  onBpmChange: (bpm: number) => void;
  onTapTempo: () => void;
  onSwingChange: (swingPercent: number) => void;
  onMixEffectsChange: (effects: Partial<MixEffects>) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onSampleKitChange: (kitId: SampleKitId) => void;
  onLaneVoiceChange: (lane: VoicedLane, id: LaneVoiceId) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onReset: () => void;
  onShare: () => void;
  onMakeVariation: () => void;
  onAddFill: () => void;
  onHumanize: () => void;
  countInEnabled: boolean;
  metronomeEnabled: boolean;
  onCountInToggle: () => void;
  onMetronomeToggle: () => void;
}

export function SequencerControls({
  bpm,
  swingPercent,
  mixEffects,
  audioEngineKind,
  sampleKitId,
  sampleKitOptions,
  laneVoices,
  canUndo,
  canRedo,
  onBpmChange,
  onTapTempo,
  onSwingChange,
  onMixEffectsChange,
  onAudioEngineKindChange,
  onSampleKitChange,
  onLaneVoiceChange,
  onUndo,
  onRedo,
  onClear,
  onReset,
  onShare,
  onMakeVariation,
  onAddFill,
  onHumanize,
  countInEnabled,
  metronomeEnabled,
  onCountInToggle,
  onMetronomeToggle,
}: SequencerControlsProps) {
  // Brief: a primary row (tempo/swing/history) plus a collapsible secondary
  // section behind a More/Less toggle. The extra controls this app ships beyond
  // the brief (mix, kit, drummer actions) live in the secondary section so the
  // primary row stays clean.
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="sequencer-controls" aria-label="Sequencer controls">
      <label className="control-field">
        <span className="eyebrow">BPM</span>
        <input
          type="number"
          min="60"
          max="180"
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
        />
      </label>
      <button
        className="button secondary compact"
        type="button"
        onClick={onTapTempo}
        title="Tap a steady beat to set the tempo"
      >
        Tap
      </button>
      <label className="control-field wide">
        <span className="eyebrow">Swing {swingPercent}%</span>
        <input
          type="range"
          min="0"
          max="30"
          value={swingPercent}
          onChange={(event) => onSwingChange(Number(event.target.value))}
        />
      </label>
      <div className="control-buttons" aria-label="History">
        <button
          className="button secondary compact icon"
          type="button"
          disabled={!canUndo}
          aria-label="Undo"
          onClick={onUndo}
        >
          ↶
        </button>
        <button
          className="button secondary compact icon"
          type="button"
          disabled={!canRedo}
          aria-label="Redo"
          onClick={onRedo}
        >
          ↷
        </button>
      </div>
      <button
        className={`button compact more-toggle ${showMore ? "active" : ""}`}
        type="button"
        aria-expanded={showMore}
        onClick={() => setShowMore((open) => !open)}
      >
        {showMore ? "Less ▴" : "More ▾"}
      </button>
      <div className="sequencer-secondary" aria-hidden={!showMore}>
        <label className="control-field">
          <span className="eyebrow">Space {Math.round(mixEffects.space * 100)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(mixEffects.space * 100)}
            onChange={(event) =>
              onMixEffectsChange({ space: Number(event.target.value) / 100 })
            }
          />
        </label>
        <label className="control-field">
          <span className="eyebrow">Echo {Math.round(mixEffects.echo * 100)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(mixEffects.echo * 100)}
            onChange={(event) =>
              onMixEffectsChange({ echo: Number(event.target.value) / 100 })
            }
          />
        </label>
        <label className="control-field engine-field">
          <span className="eyebrow">Engine</span>
          <select
            value={audioEngineKind}
            onChange={(event) =>
              onAudioEngineKindChange(event.target.value as AudioEngineKind)
            }
          >
            <option value="web-audio">Web Audio</option>
            <option value="tone-sample">Tone.js</option>
          </select>
        </label>
        <label className="control-field engine-field">
          <span className="eyebrow">Kit</span>
          <select
            value={sampleKitId}
            onChange={(event) =>
              onSampleKitChange(event.target.value as SampleKitId)
            }
          >
            {sampleKitOptions.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
              </option>
            ))}
          </select>
        </label>
        {VOICED_LANES.map((lane) => (
          <LaneVoicePicker
            key={lane}
            lane={lane}
            value={laneVoices[lane]}
            onChange={onLaneVoiceChange}
          />
        ))}
        <div className="control-buttons" aria-label="Pattern">
          <button className="button secondary compact" type="button" onClick={onClear}>
            Clear
          </button>
          <button className="button secondary compact" type="button" onClick={onReset}>
            Reset
          </button>
          <button className="button secondary compact" type="button" onClick={onShare}>
            Share link
          </button>
        </div>
        <div className="control-buttons" aria-label="Drummer">
          <button
            className="button secondary compact"
            type="button"
            onClick={onMakeVariation}
            title="Make a tasteful variation of the current beat"
          >
            Vary
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onAddFill}
            title="Add a drum fill on the last beat"
          >
            Fill
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onHumanize}
            title="Humanize the groove — vary hit dynamics so it feels less robotic"
          >
            Humanize
          </button>
        </div>
        <div className="control-buttons" aria-label="Practice aids">
          <button
            className={`button secondary compact ${countInEnabled ? "active" : ""}`}
            type="button"
            aria-pressed={countInEnabled}
            onClick={onCountInToggle}
          >
            Count-in
          </button>
          <button
            className={`button secondary compact ${metronomeEnabled ? "active" : ""}`}
            type="button"
            aria-pressed={metronomeEnabled}
            onClick={onMetronomeToggle}
          >
            Metronome
          </button>
        </div>
      </div>
    </div>
  );
}
