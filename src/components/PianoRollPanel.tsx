import { useState } from "react";
import type { MusicalKey } from "../lib/beatStyles";
import {
  describeMusicalKey,
  summarizeScalePalette,
  type ScaleToneSummary,
} from "../lib/musicTheory";
import type { PitchedInstrumentId } from "../lib/sequencerDomain";
import { normalizeBassDegree, type PaletteEntry } from "../lib/stepPitch";

/** One pitched lane's editable state, ready for the piano-roll grid. */
export interface PianoRollLane {
  id: PitchedInstrumentId;
  label: string;
  /** Per-step on/off flags (16 entries). */
  steps: boolean[];
  /** Per-step scale degree (16 entries; only meaningful where `steps` is on). */
  pitches: number[];
  /** In-key palette for this lane — index === scale degree. */
  palette: PaletteEntry[];
}

export interface PianoRollPanelProps {
  lanes: PianoRollLane[];
  musicalKey: MusicalKey;
  activeStep: number | null;
  activePitchedSteps: number;
  onTranspose: (deltaDegrees: number) => void;
  onResetPitches: () => void;
  onSetNote: (
    instrument: PitchedInstrumentId,
    stepIndex: number,
    degree: number,
  ) => void;
  onClearStep: (instrument: PitchedInstrumentId, stepIndex: number) => void;
  /** Which lane to focus first; defaults to melody when present. */
  initialLaneId?: PitchedInstrumentId;
}

export function PianoRollPanel({
  lanes,
  musicalKey,
  activeStep,
  activePitchedSteps,
  onTranspose,
  onResetPitches,
  onSetNote,
  onClearStep,
  initialLaneId,
}: PianoRollPanelProps) {
  const fallbackId =
    initialLaneId ?? lanes.find((lane) => lane.id === "melody")?.id ?? lanes[0]?.id;
  const [laneId, setLaneId] = useState<PitchedInstrumentId | undefined>(
    fallbackId,
  );
  const lane = lanes.find((entry) => entry.id === laneId) ?? lanes[0];

  if (!lane) {
    return null;
  }

  // Highest pitch on top, like a real piano roll.
  const rows = [...lane.palette].reverse();
  const scaleTones = summarizeScalePalette(lane.palette);

  return (
    <div className="tool-body piano-roll">
      <div className="tool-tab-head">
        <p className="eyebrow">Piano roll</p>
      </div>
      <div className="theory-card" aria-label={`${describeMusicalKey(musicalKey)} scale`}>
        <div>
          <p className="eyebrow">Key</p>
          <strong>{describeMusicalKey(musicalKey)}</strong>
        </div>
        <div className="scale-chip-row">
          {scaleTones.map((tone) => (
            <ScaleChip tone={tone} key={tone.degree} />
          ))}
        </div>
      </div>

      <div className="theory-actions" aria-label="Pitch actions">
        <button
          className="button secondary compact"
          type="button"
          onClick={() => onTranspose(-1)}
          disabled={activePitchedSteps === 0}
        >
          Down
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={() => onTranspose(1)}
          disabled={activePitchedSteps === 0}
        >
          Up
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onResetPitches}
          disabled={activePitchedSteps === 0}
        >
          Root notes
        </button>
      </div>

      <div
        className="piano-roll__lanes"
        role="group"
        aria-label="Lane to edit"
      >
        {lanes.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === lane.id}
            className={`piano-roll__lane-button${
              entry.id === lane.id ? " active" : ""
            }`}
            onClick={() => setLaneId(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div
        className="piano-roll__grid"
        role="group"
        aria-label={`${lane.label} notes`}
      >
        {rows.map((entry) => (
          <div className="pr-row" key={entry.degree}>
            <span className={`pr-note-label pitch-${entry.function}`}>
              {entry.label}
            </span>
            {lane.steps.map((on, stepIndex) => {
              const currentDegree = on
                ? normalizeBassDegree(
                    lane.pitches[stepIndex],
                    lane.palette.length,
                  )
                : null;
              const active = currentDegree === entry.degree;
              return (
                <button
                  key={stepIndex}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${lane.label}, note ${entry.label}, step ${
                    stepIndex + 1
                  } ${active ? "on" : "off"}`}
                  className={[
                    "pr-cell",
                    active ? "on" : "",
                    active ? `pitch-${entry.function}` : "",
                    stepIndex % 4 === 0 ? "downbeat" : "",
                    stepIndex === activeStep ? "playhead" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    active
                      ? onClearStep(lane.id, stepIndex)
                      : onSetNote(lane.id, stepIndex, entry.degree)
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaleChip({ tone }: { tone: ScaleToneSummary }) {
  return (
    <span className={`scale-chip pitch-${tone.function}`}>
      <strong>{tone.degreeLabel}</strong>
      {tone.noteLabel}
    </span>
  );
}
