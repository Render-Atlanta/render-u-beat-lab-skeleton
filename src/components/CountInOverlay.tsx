export interface CountInOverlayProps {
  beat: 4 | 3 | 2 | 1 | null;
}

export function CountInOverlay({ beat }: CountInOverlayProps) {
  if (beat === null) {
    return null;
  }

  return (
    <div className="bx-count" aria-live="polite" aria-label={`Count-in ${beat}`}>
      {beat}
    </div>
  );
}
