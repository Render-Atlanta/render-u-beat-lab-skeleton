// src/components/useRhythmGame.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameTrackSpec } from "../lib/gameTracks";
import { buildRhythmChart } from "../lib/rhythmChart";
import { applyDifficulty } from "../lib/rhythmDifficulty";
import {
  createRhythmState,
  hitRhythm,
  rhythmResult,
  updateRhythm,
  type RhythmResult,
  type RhythmState,
} from "../lib/rhythmGame";
import { keyToLane } from "../lib/rhythmView";
import { createHitSfx, renderRhythmBed } from "../audio/rhythmBed";
import { loadKitFromUrls } from "../lib/loadKit.browser";
import type { DecodedKit } from "../lib/styleRender";

export type RhythmPhase = "idle" | "loading" | "playing" | "results" | "error";
export type DrawFn = (nowMs: number, state: RhythmState) => void;
export interface RhythmHud {
  score: number;
  combo: number;
  lastJudge: RhythmState["lastJudge"];
}
export interface UseRhythmGame {
  phase: RhythmPhase;
  hud: RhythmHud;
  result: RhythmResult | null;
  error: string | null;
  start: (spec: GameTrackSpec) => Promise<void>;
  stop: () => void;
  registerDraw: (fn: DrawFn | null) => void;
}

const IDLE_HUD: RhythmHud = { score: 0, combo: 0, lastJudge: null };

export function useRhythmGame(): UseRhythmGame {
  const [phase, setPhase] = useState<RhythmPhase>("idle");
  const [hud, setHud] = useState<RhythmHud>(IDLE_HUD);
  const [result, setResult] = useState<RhythmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const kitRef = useRef<DecodedKit | null>(null);
  const sfxRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stateRef = useRef<RhythmState | null>(null);
  const drawRef = useRef<DrawFn | null>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef(0);
  // Mirror of the pushed HUD so the rAF loop can diff without depending on React
  // state (which would stale-close over the loop callback).
  const hudRef = useRef<RhythmHud>(IDLE_HUD);

  const registerDraw = useCallback((fn: DrawFn | null) => {
    drawRef.current = fn;
  }, []);

  const nowMs = useCallback(() => {
    const ctx = ctxRef.current;
    return ctx ? (ctx.currentTime - t0Ref.current) * 1000 : 0;
  }, []);

  // Push HUD to React only when a value actually changed (hits/misses, not every frame).
  const pushHud = useCallback((state: RhythmState) => {
    const prev = hudRef.current;
    if (state.score !== prev.score || state.combo !== prev.combo || state.lastJudge !== prev.lastJudge) {
      const next: RhythmHud = { score: state.score, combo: state.combo, lastJudge: state.lastJudge };
      hudRef.current = next;
      setHud(next);
    }
  }, []);

  const resetHud = useCallback(() => {
    hudRef.current = IDLE_HUD;
    setHud(IDLE_HUD);
  }, []);

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    teardown();
    stateRef.current = null;
    setPhase("idle");
    resetHud();
  }, [teardown, resetHud]);

  const playHitSfx = useCallback(() => {
    const ctx = ctxRef.current;
    const sfx = sfxRef.current;
    if (!ctx || !sfx) return;
    const node = ctx.createBufferSource();
    node.buffer = sfx;
    node.connect(ctx.destination);
    node.start();
  }, []);

  const loop = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const t = nowMs();
    updateRhythm({ state, nowMs: t });
    drawRef.current?.(t, state);
    pushHud(state);
    if (state.done) {
      teardown();
      setResult(rhythmResult(state));
      setPhase("results");
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [nowMs, teardown, pushHud]);

  const start = useCallback(async (spec: GameTrackSpec) => {
    try {
      // Re-entrancy guard: a second start() before stop()/completion must clean up
      // the prior game (stop its source, cancel its rAF) so we don't leak an audible
      // source node or double-schedule loops mutating the same state. teardown()
      // already cancels the rAF and stops+disconnects the current source.
      teardown();
      setError(null);
      setResult(null);
      setPhase("loading");
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      if (!kitRef.current) kitRef.current = await loadKitFromUrls();
      if (!sfxRef.current) sfxRef.current = createHitSfx(ctx);

      const built = applyDifficulty(buildRhythmChart(spec));
      const state = createRhythmState(built);
      stateRef.current = state;
      resetHud();

      const bed = renderRhythmBed(spec, kitRef.current, ctx);
      const source = ctx.createBufferSource();
      source.buffer = bed;
      source.connect(ctx.destination);
      // Lead-in: start the clock `approachMs` before the audio so the first notes
      // (timeMs 0) fall in and land on the judge line exactly when the bed begins.
      t0Ref.current = ctx.currentTime + state.approachMs / 1000;
      source.start(t0Ref.current);
      sourceRef.current = source;

      setPhase("playing");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      teardown();
      stateRef.current = null;
      setError(err instanceof Error ? err.message : "Failed to start");
      setPhase("error");
    }
  }, [loop, teardown, resetHud]);

  // Keyboard input only while playing.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // held keys must not auto-hit later notes
      const state = stateRef.current;
      if (!state) return;
      const lane = keyToLane(e.key, state.keys);
      if (lane == null) return;
      const res = hitRhythm(state, lane, nowMs());
      if (res.kind !== "ghost") {
        playHitSfx();
        pushHud(state);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, nowMs, playHitSfx, pushHud]);

  // Tear down on unmount.
  useEffect(() => () => {
    teardown();
    ctxRef.current?.close().catch(() => { /* ignore */ });
  }, [teardown]);

  return useMemo(
    () => ({ phase, hud, result, error, start, stop, registerDraw }),
    [phase, hud, result, error, start, stop, registerDraw],
  );
}
