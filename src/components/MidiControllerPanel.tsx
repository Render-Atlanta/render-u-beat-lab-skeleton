import { useEffect, useRef, useState } from "react";
import {
  MIDI_NOTE_TO_INSTRUMENT,
  getNextMidiRecordStep,
  parseMidiNoteMessage,
  resolveMidiRecordStep,
  type MidiNoteTrigger,
} from "../lib/midiInput";
import { INSTRUMENTS } from "../lib/instruments";

type MidiStatus = "idle" | "listening" | "unsupported" | "error";

interface MidiMessageEventLike {
  data: ArrayLike<number>;
}

interface MidiInputLike {
  name?: string | null;
  manufacturer?: string | null;
  onmidimessage: ((event: MidiMessageEventLike) => void) | null;
}

interface MidiAccessLike {
  inputs: {
    values(): IterableIterator<MidiInputLike>;
  };
  onstatechange: (() => void) | null;
}

export interface MidiControllerPanelProps {
  activeStep: number | null;
  onTrigger: (trigger: MidiNoteTrigger, stepIndex: number) => void;
}

export function MidiControllerPanel({
  activeStep,
  onTrigger,
}: MidiControllerPanelProps) {
  const [status, setStatus] = useState<MidiStatus>("idle");
  const [inputNames, setInputNames] = useState<string[]>([]);
  const [recordStep, setRecordStep] = useState(0);
  const [followPlayhead, setFollowPlayhead] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [latest, setLatest] = useState<MidiNoteTrigger | null>(null);
  const accessRef = useRef<MidiAccessLike | null>(null);
  const activeStepRef = useRef(activeStep);
  const recordStepRef = useRef(recordStep);
  const followPlayheadRef = useRef(followPlayhead);
  const autoAdvanceRef = useRef(autoAdvance);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    recordStepRef.current = recordStep;
  }, [recordStep]);

  useEffect(() => {
    followPlayheadRef.current = followPlayhead;
  }, [followPlayhead]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => () => disconnectInputs(accessRef.current), []);

  async function enableMidi() {
    const requestMIDIAccess = (navigator as unknown as {
      requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<MidiAccessLike>;
    }).requestMIDIAccess;

    if (!requestMIDIAccess) {
      setStatus("unsupported");
      return;
    }

    try {
      const access = await requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      connectInputs(access, handleMidiMessage);
      access.onstatechange = () => connectInputs(access, handleMidiMessage);
      setStatus("listening");
    } catch {
      setStatus("error");
    }
  }

  function disableMidi() {
    disconnectInputs(accessRef.current);
    accessRef.current = null;
    setInputNames([]);
    setStatus("idle");
  }

  function connectInputs(
    access: MidiAccessLike,
    onMessage: (event: MidiMessageEventLike) => void,
  ) {
    const inputs = Array.from(access.inputs.values());
    for (const input of inputs) {
      input.onmidimessage = onMessage;
    }
    setInputNames(inputs.map(getInputName));
  }

  function handleMidiMessage(event: MidiMessageEventLike) {
    const trigger = parseMidiNoteMessage(event.data);
    if (!trigger) {
      return;
    }

    const stepIndex = resolveMidiRecordStep(
      activeStepRef.current,
      recordStepRef.current,
      followPlayheadRef.current,
    );
    onTriggerRef.current(trigger, stepIndex);
    setLatest(trigger);
    if (autoAdvanceRef.current && !(followPlayheadRef.current && activeStepRef.current !== null)) {
      setRecordStep(getNextMidiRecordStep(stepIndex));
    }
  }

  const listening = status === "listening";
  const mappings = Object.entries(MIDI_NOTE_TO_INSTRUMENT).map(([note, instrument]) => ({
    note: Number(note),
    label: INSTRUMENTS.find((entry) => entry.id === instrument)?.label ?? instrument,
  }));

  return (
    <div className="tool-body midi-panel">
      <div className="tool-tab-head">
        <p className="eyebrow">MIDI</p>
        <button
          className="button secondary compact"
          type="button"
          onClick={listening ? disableMidi : enableMidi}
        >
          {listening ? "Disconnect" : "Enable"}
        </button>
      </div>

      <div className={`midi-status midi-status--${status}`}>
        <span>{getStatusLabel(status, inputNames.length)}</span>
      </div>

      <div className="midi-controls">
        <label className="midi-toggle">
          <input
            type="checkbox"
            checked={followPlayhead}
            onChange={(event) => setFollowPlayhead(event.target.checked)}
          />
          <span>Follow playhead</span>
        </label>
        <label className="midi-toggle">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(event) => setAutoAdvance(event.target.checked)}
          />
          <span>Auto-advance</span>
        </label>
        <label className="control-field midi-step-field">
          <span className="eyebrow">Step</span>
          <select
            value={recordStep}
            onChange={(event) => setRecordStep(Number(event.target.value))}
          >
            {Array.from({ length: 16 }, (_, index) => (
              <option key={index} value={index}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      {inputNames.length > 0 ? (
        <div className="midi-input-list" aria-label="MIDI inputs">
          {inputNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      ) : null}

      <div className="midi-map" aria-label="MIDI note map">
        {mappings.map((mapping) => (
          <span key={mapping.note}>
            {mapping.note} · {mapping.label}
          </span>
        ))}
      </div>

      <p className="status-copy" aria-live="polite">
        {latest
          ? `${latest.noteName} → ${INSTRUMENTS.find((entry) => entry.id === latest.instrument)?.label ?? latest.instrument}`
          : "Waiting for note input."}
      </p>
    </div>
  );
}

function disconnectInputs(access: MidiAccessLike | null) {
  if (!access) {
    return;
  }

  access.onstatechange = null;
  for (const input of access.inputs.values()) {
    input.onmidimessage = null;
  }
}

function getInputName(input: MidiInputLike): string {
  return input.name || input.manufacturer || "MIDI input";
}

function getStatusLabel(status: MidiStatus, inputCount: number): string {
  if (status === "listening") {
    return inputCount === 1 ? "1 input connected" : `${inputCount} inputs connected`;
  }
  if (status === "unsupported") {
    return "Web MIDI unavailable";
  }
  if (status === "error") {
    return "MIDI permission unavailable";
  }
  return "MIDI idle";
}
