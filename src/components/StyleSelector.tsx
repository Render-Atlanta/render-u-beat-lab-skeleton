import { getStyleCoach } from "../lib/beatCoach";
import { type BeatStyle, type BeatStyleId } from "../lib/beatStyles";
import { getSwingPercent } from "../lib/sequencerDomain";

export interface StyleSelectorProps {
  styles: BeatStyle[];
  selectedStyleId: BeatStyleId;
  onSelectStyle: (styleId: BeatStyleId) => void;
}

export function StyleSelector({
  styles,
  selectedStyleId,
  onSelectStyle,
}: StyleSelectorProps) {
  return (
    <aside className="panel style-panel">
      <div className="panel-header">
        <p className="eyebrow">Styles</p>
        <h2 className="heading">Choose a starting pocket</h2>
      </div>
      <div className="style-list">
        {styles.map((beatStyle) => (
          <button
            aria-pressed={beatStyle.id === selectedStyleId}
            className={`style-card ${beatStyle.id === selectedStyleId ? "active" : ""}`}
            data-style-id={beatStyle.id}
            key={beatStyle.id}
            type="button"
            onClick={() => onSelectStyle(beatStyle.id)}
          >
            <span className="style-name">{beatStyle.name}</span>
            <span className="style-meta">
              {beatStyle.bpm} BPM · swing {getSwingPercent(beatStyle.swing)}%
            </span>
            <span className="style-note">{getStyleCoach(beatStyle.id).feelNote}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
