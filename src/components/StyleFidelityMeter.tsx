// src/components/StyleFidelityMeter.tsx
import { useMemo } from "react";
import type { BeatStyle } from "../lib/beatStyles";
import type { DecodedKit } from "../lib/styleRender";
import { scoreStyleFidelity } from "../lib/styleFidelity";

interface StyleFidelityMeterProps {
  style: BeatStyle;
  kit: DecodedKit | null;
  kitError?: boolean;
}

export function StyleFidelityMeter({ style, kit, kitError }: StyleFidelityMeterProps) {
  const result = useMemo(
    () => (kit ? scoreStyleFidelity(style, kit) : null),
    [style, kit],
  );

  if (kitError) {
    return <div className="style-fidelity">fidelity unavailable</div>;
  }
  if (!result) {
    return <div className="style-fidelity" aria-busy="true">Analyzing…</div>;
  }

  const pct = Math.round(result.score * 100);
  const drifted = result.nearestGenre !== style.id;
  return (
    <div className="style-fidelity">
      <span className="style-fidelity__label">
        {pct}% {style.id}-like
      </span>
      <div className="style-fidelity__bar" role="meter" aria-label={`${style.id} style fidelity`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="style-fidelity__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {drifted && (
        <span className="style-fidelity__hint">
          (closer to {result.nearestGenre})
        </span>
      )}
    </div>
  );
}
