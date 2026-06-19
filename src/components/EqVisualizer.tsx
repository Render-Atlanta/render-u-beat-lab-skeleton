import { useEffect, useRef } from "react";
import type { BeatEngine } from "../audio/beatEngine";
import { mapFrequencyBars } from "../lib/eqBars";

const BAR_COUNT = 24;

export interface EqVisualizerProps {
  engine: BeatEngine | null;
  isPlaying: boolean;
}

export function EqVisualizer({ engine, isPlaying }: EqVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const data = new Uint8Array(128);
    let frame = 0;

    const draw = () => {
      const ok = isPlaying && engine ? engine.getFrequencyData(data) : false;
      const bars = ok ? mapFrequencyBars(data, BAR_COUNT) : new Array(BAR_COUNT).fill(0);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const barWidth = width / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const barHeight = Math.max(1, bars[i] * height);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
      // Only keep the loop alive while playing; when paused we draw a single
      // idle frame (above) and stop, avoiding 60fps repaint overhead.
      if (isPlaying) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => window.cancelAnimationFrame(frame);
  }, [engine, isPlaying]);

  return (
    <div className="eq-visualizer">
      <span className="eyebrow">Equalizer</span>
      <canvas
        ref={canvasRef}
        width={320}
        height={80}
        role="img"
        aria-label="Live equalizer spectrum"
      />
    </div>
  );
}
