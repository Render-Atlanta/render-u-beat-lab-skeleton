import type { AudioEngineKind } from "../audio/audioEngine";

export interface SequencerControlsProps {
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  canUndo: boolean;
  canRedo: boolean;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onReset: () => void;
  onShare: () => void;
  countInEnabled: boolean;
  metronomeEnabled: boolean;
  onCountInToggle: () => void;
  onMetronomeToggle: () => void;
}

export function SequencerControls({
  bpm,
  swingPercent,
  audioEngineKind,
  canUndo,
  canRedo,
  onBpmChange,
  onSwingChange,
  onAudioEngineKindChange,
  onUndo,
  onRedo,
  onClear,
  onReset,
  onShare,
  countInEnabled,
  metronomeEnabled,
  onCountInToggle,
  onMetronomeToggle,
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
      {/* Count-in + metronome practice aids */}
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
  );
}
