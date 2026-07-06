// src/components/RhythmHighway.tsx
import { useEffect, useRef } from "react";
import { isNoteVisible, noteProgress } from "../lib/rhythmView";
import type { RhythmState } from "../lib/rhythmGame";
import type { DrawFn } from "./useRhythmGame";

const WIDTH = 480;
const HEIGHT = 640;
const JUDGE_Y = HEIGHT - 90;

interface Props {
  registerDraw: (fn: DrawFn | null) => void;
  laneCount: number;
  accent: string;
}

export function RhythmHighway({ registerDraw, laneCount, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const laneW = WIDTH / laneCount;

    const draw: DrawFn = (nowMs: number, state: RhythmState) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // lanes + judge line
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      for (let l = 1; l < laneCount; l++) {
        ctx.beginPath();
        ctx.moveTo(l * laneW, 0);
        ctx.lineTo(l * laneW, HEIGHT);
        ctx.stroke();
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, JUDGE_Y);
      ctx.lineTo(WIDTH, JUDGE_Y);
      ctx.stroke();
      ctx.lineWidth = 1;
      // notes
      for (const n of state.notes) {
        if (n.judged === "perfect" || n.judged === "good") continue;
        if (!isNoteVisible(n.timeMs, nowMs, state.approachMs, state.goodMs)) continue;
        const y = noteProgress(n.timeMs, nowMs, state.approachMs) * JUDGE_Y;
        const x = n.lane * laneW + laneW / 2;
        ctx.fillStyle = n.judged === "miss" ? "rgba(255,80,80,0.5)" : accent;
        ctx.beginPath();
        ctx.ellipse(x, y, laneW * 0.34, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw, laneCount, accent]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="rhythm-highway"
      aria-label="Note highway"
      role="img"
    />
  );
}
