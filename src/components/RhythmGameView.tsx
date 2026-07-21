// src/components/RhythmGameView.tsx
// Hosts RenderATL Rush (Phaser) — the approved Claude Design arcade rhythm game.
// The Phaser engine is imported lazily inside the mount effect so it never enters
// the SSR/test module graph (it touches window/document at import time).
import { useEffect, useRef } from "react";

export function RhythmGameView({ onExit }: { onExit: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;
    void import("../game/rushGame").then(({ createRushGame }) => {
      if (cancelled || !hostRef.current) return;
      destroy = createRushGame(hostRef.current, { onExit: () => onExitRef.current() });
    });
    return () => { cancelled = true; destroy?.(); };
  }, []);

  return (
    <section className="rush-view" aria-label="RenderATL Rush">
      <button type="button" className="rush-view__back" onClick={() => onExitRef.current()}>
        ← Beat Lab
      </button>
      <div className="rush-view__host" ref={hostRef} />
    </section>
  );
}
