// src/components/RhythmGameView.tsx
import { useState } from "react";
import { GAME_TRACK_SPECS } from "../lib/gameTracks";
import { RhythmHighway } from "./RhythmHighway";
import { useRhythmGame } from "./useRhythmGame";

interface StageMeta {
  name: string;
  accent: string;
}

const STAGE_META: Record<string, StageMeta> = {
  airport: { name: "Airport Arrival", accent: "#f5892b" },
  connector: { name: "Connector Sprint", accent: "#f95bd0" },
  badge: { name: "Badge Pickup", accent: "#a56ef0" },
  vendor: { name: "Vendor Hall", accent: "#23d98a" },
  mainStage: { name: "Main Stage", accent: "#f53d3d" },
  afterparty: { name: "Afterparty", accent: "#26c3e8" },
};

const meta = (slug: string): StageMeta => STAGE_META[slug] ?? { name: slug, accent: "#8b8b8b" };

export function RhythmGameView({ onExit }: { onExit: () => void }) {
  const game = useRhythmGame();
  const [activeSlug, setActiveSlug] = useState<string>(GAME_TRACK_SPECS[0].slug);
  const accent = meta(activeSlug).accent;

  return (
    <section className="rhythm-view" aria-label="Rhythm game">
      <header className="rhythm-view__bar">
        <button type="button" onClick={() => { game.stop(); onExit(); }}>← Back to Beat Lab</button>
        {game.phase === "playing" && (
          <span className="rhythm-view__hud">
            Score {game.hud.score} · Combo {game.hud.combo}
            {game.hud.lastJudge ? ` · ${game.hud.lastJudge.toUpperCase()}` : ""}
          </span>
        )}
      </header>

      {(game.phase === "idle" || game.phase === "loading" || game.phase === "error") && (
        <div className="rhythm-select">
          <h2>Pick a stage</h2>
          {game.error && <p className="rhythm-error">{game.error}</p>}
          <div className="rhythm-select__grid">
            {GAME_TRACK_SPECS.map((spec) => {
              const m = meta(spec.slug);
              return (
                <button
                  key={spec.slug}
                  type="button"
                  className="rhythm-card"
                  style={{ borderColor: m.accent }}
                  disabled={game.phase === "loading"}
                  onClick={() => { setActiveSlug(spec.slug); void game.start(spec); }}
                >
                  <span className="rhythm-card__name">{m.name}</span>
                  <span className="rhythm-card__meta">{spec.styleId} · {spec.bpm} BPM</span>
                </button>
              );
            })}
          </div>
          <p className="rhythm-hint">Tap D F J K in time with the falling notes.</p>
        </div>
      )}

      {game.phase === "playing" && (
        <div className="rhythm-stage">
          <RhythmHighway registerDraw={game.registerDraw} laneCount={4} accent={accent} />
        </div>
      )}

      {game.phase === "results" && game.result && (
        <div className="rhythm-results">
          <h2>Results</h2>
          <p className="rhythm-results__score">{game.result.score}</p>
          <p>{game.result.accuracy}% accuracy · max combo {game.result.maxCombo}</p>
          <p className="rhythm-results__counts">
            {game.result.perfect} perfect · {game.result.good} good · {game.result.miss} miss
          </p>
          <button type="button" onClick={() => game.stop()}>Back to stages</button>
        </div>
      )}
    </section>
  );
}
