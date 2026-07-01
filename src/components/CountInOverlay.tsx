export interface CountInOverlayProps {
  beat: 4 | 3 | 2 | 1 | null;
}

export function CountInOverlay({ beat }: CountInOverlayProps) {
  if (beat === null) {
    return null;
  }

  return (
    <div className="count-in" aria-live="polite" aria-label={`Count-in ${beat}`}>
      {/* key forces a remount each beat so the pop animation replays. */}
      <span key={beat} className="count-in__number bx-count">
        {beat}
      </span>
      <span className="count-in__caption">Count-in</span>
    </div>
  );
}
