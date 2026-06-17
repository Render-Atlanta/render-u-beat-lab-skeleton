import { useEffect, useMemo, useRef, useState } from "react";
import { createBeatEngine, type BeatEngine } from "./audio/beatEngine";
import { BEAT_STYLES, type BeatStyle, type BeatStyleId } from "./lib/beatStyles";
import {
  createDefaultSequencerState,
  readSequencerStateFromParams,
  togglePatternStep,
  writeSequencerStateToParams,
  type SequencerState,
} from "./lib/patternState";
import { countActiveSteps, type InstrumentId } from "./lib/patterns";

const INSTRUMENTS: Array<{ id: InstrumentId; label: string }> = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hat" },
  { id: "openHat", label: "Open" },
];

export function App() {
  const [sequencer, setSequencer] = useState<SequencerState>(() =>
    readSequencerStateFromParams(new URLSearchParams(window.location.search)),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [producerTag, setProducerTag] = useState("Render U made this");
  const engineRef = useRef<BeatEngine | null>(null);

  const baseStyle = BEAT_STYLES[sequencer.styleId];
  const activeSteps = useMemo(
    () => countActiveSteps(sequencer.pattern),
    [sequencer.pattern],
  );
  const playableStyle = useMemo<BeatStyle>(
    () => ({
      ...baseStyle,
      bpm: sequencer.bpm,
      swing: sequencer.swing,
      pattern: sequencer.pattern,
    }),
    [baseStyle, sequencer.bpm, sequencer.pattern, sequencer.swing],
  );

  useEffect(() => {
    const params = writeSequencerStateToParams(sequencer);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [sequencer]);

  async function getEngine() {
    if (!engineRef.current) {
      engineRef.current = createBeatEngine();
    }
    await engineRef.current.ready();
    return engineRef.current;
  }

  async function togglePlayback() {
    const engine = await getEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      return;
    }

    engine.start(playableStyle);
    setIsPlaying(true);
  }

  async function playProducerTag() {
    const engine = await getEngine();
    engine.playProducerTag(producerTag);
  }

  function applySequencerState(next: SequencerState) {
    setSequencer(next);
    if (isPlaying && engineRef.current) {
      engineRef.current.start({
        ...BEAT_STYLES[next.styleId],
        bpm: next.bpm,
        swing: next.swing,
        pattern: next.pattern,
      });
    }
  }

  function resetToStyle(styleId = sequencer.styleId) {
    applySequencerState(createDefaultSequencerState(styleId));
  }

  function updateBpm(bpm: number) {
    if (!Number.isFinite(bpm)) {
      return;
    }

    applySequencerState({
      ...sequencer,
      bpm: Math.max(60, Math.min(180, Math.round(bpm))),
    });
  }

  function updateSwing(swingPercent: number) {
    if (!Number.isFinite(swingPercent)) {
      return;
    }

    const clampedSwing = Math.max(0, Math.min(30, Math.round(swingPercent)));
    applySequencerState({ ...sequencer, swing: clampedSwing / 100 });
  }

  function toggleStep(instrument: InstrumentId, stepIndex: number) {
    applySequencerState({
      ...sequencer,
      pattern: togglePatternStep(sequencer.pattern, instrument, stepIndex),
    });
  }

  return (
    <main data-palette="atl" className="app-shell">
      <nav className="site-nav" aria-label="Primary">
        <a className="brand-lockup" href="#top">
          <span aria-hidden="true">★</span>
          Render U Beat Lab
        </a>
        <div className="nav-actions">
          <span className="eyebrow">Prototype 01</span>
        </div>
      </nav>

      <section id="top" className="hero">
        <p className="eyebrow">★ From vibe coding to AI engineering</p>
        <h1 className="display display-xl">
          Turn table taps into a <span className="underline-accent">beat</span>
        </h1>
        <p className="hero-copy">
          A workshop skeleton for learning reusable AI workflows through a real
          browser music toy: patterns first, capture next, producer polish after.
        </p>
        <div className="hero-actions">
          <button className="star-button" type="button" onClick={togglePlayback}>
            <span aria-hidden="true">★</span>
            {isPlaying ? "Stop loop" : "Run it"}
            <span aria-hidden="true">★</span>
          </button>
          <button className="button secondary" type="button" onClick={playProducerTag}>
            Producer tag
          </button>
        </div>
      </section>

      <section className="workbench" aria-label="Beat workbench">
        <aside className="panel style-panel">
          <div className="panel-header">
            <p className="eyebrow">Styles</p>
            <h2 className="heading">Choose a starting pocket</h2>
          </div>
          <div className="style-list">
            {Object.values(BEAT_STYLES).map((beatStyle) => (
              <button
                className={`style-card ${beatStyle.id === sequencer.styleId ? "active" : ""}`}
                key={beatStyle.id}
                type="button"
                onClick={() => {
                  resetToStyle(beatStyle.id);
                }}
              >
                <span className="style-name">{beatStyle.name}</span>
                <span className="style-meta">
                  {beatStyle.bpm} BPM · swing {Math.round(beatStyle.swing * 100)}%
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel grid-panel">
          <div className="panel-header split">
            <div>
              <p className="eyebrow">Pattern</p>
              <h2 className="heading">{baseStyle.name}</h2>
            </div>
            <div className="stat-block">
              <span>{activeSteps}</span>
              hits
            </div>
          </div>

          <div className="sequencer-controls" aria-label="Sequencer controls">
            <label className="control-field">
              <span className="eyebrow">BPM</span>
              <input
                type="number"
                min="60"
                max="180"
                value={sequencer.bpm}
                onChange={(event) => updateBpm(Number(event.target.value))}
              />
            </label>
            <label className="control-field wide">
              <span className="eyebrow">Swing {Math.round(sequencer.swing * 100)}%</span>
              <input
                type="range"
                min="0"
                max="30"
                value={Math.round(sequencer.swing * 100)}
                onChange={(event) => updateSwing(Number(event.target.value))}
              />
            </label>
            <button className="button secondary compact" type="button" onClick={() => resetToStyle()}>
              Reset
            </button>
          </div>

          <div className="step-grid" aria-label={`${baseStyle.name} drum pattern`}>
            {INSTRUMENTS.map((instrument) => (
              <div className="track-row" key={instrument.id}>
                <div className="track-label">{instrument.label}</div>
                {sequencer.pattern[instrument.id].map((step, index) => (
                  <button
                    className={`step-cell ${step ? "on" : ""} ${
                      index % 4 === 0 ? "downbeat" : ""
                    }`}
                    key={`${instrument.id}-${index}`}
                    type="button"
                    aria-pressed={step}
                    aria-label={`${instrument.label} step ${index + 1} ${
                      step ? "on" : "off"
                    }`}
                    onClick={() => toggleStep(instrument.id, index)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="panel coach-panel">
          <div className="panel-header">
            <p className="eyebrow">Beat coach</p>
            <h2 className="heading">Why this works</h2>
          </div>
          <p>{baseStyle.lesson}</p>
          <label className="tag-field">
            <span className="eyebrow">Producer tag</span>
            <input
              value={producerTag}
              onChange={(event) => setProducerTag(event.target.value)}
              maxLength={48}
            />
          </label>
          <div className="capture-placeholder">
            <p className="eyebrow">Next prototype</p>
            <p>Record beatbox or table taps, detect hits, quantize to this grid.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
