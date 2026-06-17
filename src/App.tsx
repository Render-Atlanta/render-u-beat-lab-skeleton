import { useMemo, useRef, useState } from "react";
import { createBeatEngine, type BeatEngine } from "./audio/beatEngine";
import { BEAT_STYLES, type BeatStyleId } from "./lib/beatStyles";
import { countActiveSteps, type InstrumentId } from "./lib/patterns";

const INSTRUMENTS: Array<{ id: InstrumentId; label: string }> = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hat" },
  { id: "openHat", label: "Open" },
];

export function App() {
  const [selectedStyle, setSelectedStyle] = useState<BeatStyleId>("trap");
  const [isPlaying, setIsPlaying] = useState(false);
  const [producerTag, setProducerTag] = useState("Render U made this");
  const engineRef = useRef<BeatEngine | null>(null);

  const style = BEAT_STYLES[selectedStyle];
  const activeSteps = useMemo(() => countActiveSteps(style.pattern), [style]);

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

    engine.start(style);
    setIsPlaying(true);
  }

  async function playProducerTag() {
    const engine = await getEngine();
    engine.playProducerTag(producerTag);
  }

  return (
    <main data-palette="atl" className="app-shell">
      <nav className="site-nav" aria-label="Primary">
        <a className="brand-lockup" href="#top">
          <span aria-hidden="true">★</span>
          Render U Beat Lab
        </a>
        <div className="nav-actions">
          <span className="eyebrow">Prototype 00</span>
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
                className={`style-card ${beatStyle.id === selectedStyle ? "active" : ""}`}
                key={beatStyle.id}
                type="button"
                onClick={() => {
                  setSelectedStyle(beatStyle.id);
                  if (isPlaying && engineRef.current) {
                    engineRef.current.start(beatStyle);
                  }
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
              <h2 className="heading">{style.name}</h2>
            </div>
            <div className="stat-block">
              <span>{activeSteps}</span>
              hits
            </div>
          </div>

          <div className="step-grid" aria-label={`${style.name} drum pattern`}>
            {INSTRUMENTS.map((instrument) => (
              <div className="track-row" key={instrument.id}>
                <div className="track-label">{instrument.label}</div>
                {style.pattern[instrument.id].map((step, index) => (
                  <div
                    className={`step-cell ${step ? "on" : ""} ${
                      index % 4 === 0 ? "downbeat" : ""
                    }`}
                    key={`${instrument.id}-${index}`}
                    aria-label={`${instrument.label} step ${index + 1} ${
                      step ? "on" : "off"
                    }`}
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
          <p>{style.lesson}</p>
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
