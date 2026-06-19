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
    <section className="style-strip" aria-label="Beat styles">
      <p className="eyebrow">Choose a starting pocket</p>
      <div className="style-strip__track">
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
    </section>
  );
}
