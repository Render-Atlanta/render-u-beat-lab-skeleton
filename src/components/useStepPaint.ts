import { useRef } from "react";
import type { InstrumentId } from "../lib/patterns";

const PITCHED_LANES = new Set<InstrumentId>(["808", "melody"]);

export function useStepPaint(
  onPaintStep: (instrument: InstrumentId, stepIndex: number) => void,
) {
  const paintStartRef = useRef<{
    instrument: InstrumentId;
    stepIndex: number;
  } | null>(null);
  const didPaintRef = useRef(false);
  const paintedCellsRef = useRef(new Set<string>());

  function beginPaint(
    instrument: InstrumentId,
    stepIndex: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0 || PITCHED_LANES.has(instrument)) {
      return;
    }

    paintStartRef.current = { instrument, stepIndex };
    didPaintRef.current = false;
    paintedCellsRef.current.clear();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function paintFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const start = paintStartRef.current;
    if (!start) {
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-step-cell='true']");
    const instrument = target?.dataset.instrument as InstrumentId | undefined;
    const stepIndex = Number(target?.dataset.stepIndex);
    if (
      !instrument ||
      instrument !== start.instrument ||
      PITCHED_LANES.has(instrument) ||
      !Number.isInteger(stepIndex)
    ) {
      return;
    }

    if (!didPaintRef.current) {
      paintCell(start.instrument, start.stepIndex);
      didPaintRef.current = true;
    }
    paintCell(instrument, stepIndex);
  }

  function endPaint() {
    paintStartRef.current = null;
  }

  function shouldSuppressClick(): boolean {
    if (!didPaintRef.current) {
      return false;
    }

    didPaintRef.current = false;
    return true;
  }

  function paintCell(instrument: InstrumentId, stepIndex: number) {
    const key = `${instrument}-${stepIndex}`;
    if (paintedCellsRef.current.has(key)) {
      return;
    }

    paintedCellsRef.current.add(key);
    onPaintStep(instrument, stepIndex);
  }

  return { beginPaint, paintFromPointer, endPaint, shouldSuppressClick };
}
