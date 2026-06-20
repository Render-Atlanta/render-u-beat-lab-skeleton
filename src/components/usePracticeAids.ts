import { useEffect, useRef, useState } from "react";
import type { BeatEngine } from "../audio/beatEngine";
import {
  runCountIn,
  type CountInBeat,
  type CountInHandle,
} from "../lib/countIn";
import { shouldPulseMetronomeDot } from "../lib/metronome";

export function usePracticeAids(options: {
  bpm: number;
  isPlaying: boolean;
  activeStep: number | null;
  getEngine: () => Promise<BeatEngine>;
  onStartPlayback: (metronomeEnabled: boolean) => Promise<void>;
  onStopPlayback: () => void;
}) {
  const { bpm, isPlaying, activeStep, getEngine, onStartPlayback, onStopPlayback } =
    options;
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [countInBeat, setCountInBeat] = useState<CountInBeat | null>(null);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [metroPulse, setMetroPulse] = useState(false);
  const countInHandleRef = useRef<CountInHandle | null>(null);
  const countInActiveRef = useRef(false);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const metronomeRequestRef = useRef(0);
  const onStartPlaybackRef = useRef(onStartPlayback);
  const onStopPlaybackRef = useRef(onStopPlayback);

  metronomeEnabledRef.current = metronomeEnabled;
  onStartPlaybackRef.current = onStartPlayback;
  onStopPlaybackRef.current = onStopPlayback;

  useEffect(() => {
    if (!isPlaying) {
      setMetroPulse(false);
      return;
    }

    if (!shouldPulseMetronomeDot(metronomeEnabled, activeStep)) {
      return;
    }

    setMetroPulse(true);
    const timer = window.setTimeout(() => setMetroPulse(false), 120);
    return () => window.clearTimeout(timer);
  }, [activeStep, isPlaying, metronomeEnabled]);

  function cancelCountIn() {
    countInActiveRef.current = false;
    countInHandleRef.current?.cancel();
    countInHandleRef.current = null;
    setIsCountingIn(false);
    setCountInBeat(null);
  }

  async function setEngineMetronome(enabled: boolean) {
    const requestId = ++metronomeRequestRef.current;
    const engine = await getEngine();
    if (requestId !== metronomeRequestRef.current) {
      return;
    }
    engine.setMetronomeEnabled(enabled);
  }

  function toggleCountIn() {
    setCountInEnabled((current) => !current);
  }

  function toggleMetronome() {
    setMetronomeEnabled((current) => {
      const next = !current;
      void setEngineMetronome(next);
      return next;
    });
  }

  async function startCountIn() {
    countInActiveRef.current = true;
    setIsCountingIn(true);

    try {
      const engine = await getEngine();
      if (!countInActiveRef.current) {
        return;
      }

      countInHandleRef.current = runCountIn(
        bpm,
        {
          onBeat: (beat) => {
            setCountInBeat(beat);
            engine.playClick(true);
          },
          onComplete: () => {
            countInActiveRef.current = false;
            countInHandleRef.current = null;
            setIsCountingIn(false);
            setCountInBeat(null);
            void onStartPlaybackRef.current(metronomeEnabledRef.current);
          },
        },
        {
          setTimeout: (callback, delayMs) =>
            window.setTimeout(callback, delayMs) as unknown as number,
          clearTimeout: (timeoutId) => window.clearTimeout(timeoutId),
        },
      );
    } catch {
      cancelCountIn();
    }
  }

  async function handlePlayRequest() {
    if (isCountingIn || countInActiveRef.current) {
      cancelCountIn();
      return;
    }

    if (isPlaying) {
      onStopPlaybackRef.current();
      return;
    }

    if (countInEnabled) {
      await startCountIn();
      return;
    }

    await onStartPlaybackRef.current(metronomeEnabledRef.current);
  }

  return {
    countInEnabled,
    metronomeEnabled,
    countInBeat,
    isCountingIn,
    metroPulse,
    toggleCountIn,
    toggleMetronome,
    cancelCountIn,
    handlePlayRequest,
    setEngineMetronome,
  };
}
