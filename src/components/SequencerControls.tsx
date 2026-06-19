import type { AudioEngineKind } from "../audio/audioEngine";

export interface SequencerControlsProps {
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onClear: () => void;
  onReset: () => void;
}

export function SequencerControls({
  bpm,
  swingPercent,
  audioEngineKind,
  onBpmChange,
  onSwingChange,
  onAudioEngineKindChange,
  onClear,
  onReset,
}: SequencerControlsProps) {
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
      {/* Tap tempo arrives in PR-36 — rendered inert so the control row is final. */}
      <button
        className="button secondary compact"
        type="button"
        disabled
        title="Tap tempo arrives in a follow-up update"
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
      <label className="control-field">
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
      {/* Undo/redo arrive in PR-34; rendered inert for now. Clear + Reset work. */}
      <div className="control-buttons" aria-label="History">
        <button
          className="button secondary compact icon"
          type="button"
          disabled
          aria-label="Undo"
          title="Undo arrives in a follow-up update"
        >
          ↶
        </button>
        <button
          className="button secondary compact icon"
          type="button"
          disabled
          aria-label="Redo"
          title="Redo arrives in a follow-up update"
        >
          ↷
        </button>
        <button className="button secondary compact" type="button" onClick={onClear}>
          Clear
        </button>
        <button className="button secondary compact" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
      {/* Count-in + metronome arrive in PR-35; rendered inert for now. */}
      <div className="control-buttons" aria-label="Practice aids">
        <button
          className="button secondary compact"
          type="button"
          disabled
          title="Count-in arrives in a follow-up update"
        >
          Count-in
        </button>
        <button
          className="button secondary compact"
          type="button"
          disabled
          title="Metronome arrives in a follow-up update"
        >
          Metronome
        </button>
      </div>
    </div>
  );
}
