import {
  getArrangementBarCount,
  type Arrangement,
} from "./arrangement";
import { getStyleCoach, summarizePatternChange } from "./beatCoach";
import { BEAT_STYLES } from "./beatStyles";
import { INSTRUMENT_ORDER, type SequencerState } from "./patternState";
import { countActiveSteps } from "./patterns";
import { getSwingPercent } from "./sequencerDomain";

export interface AiBeatContext {
  styleId: string;
  styleName: string;
  bpm: number;
  swingPercent: number;
  activeSteps: number;
  densityLevel: string;
  densitySummary: string;
  pocketSummary: string;
  tryThis: string;
  activeLanes: string[];
  laneHitCounts: Record<string, number>;
  arrangementBars?: number;
  arrangementSections?: Record<string, number>;
}

export function createAiBeatContext(
  sequencer: SequencerState,
  arrangement?: Arrangement,
): AiBeatContext {
  const style = BEAT_STYLES[sequencer.styleId];
  const styleCoach = getStyleCoach(sequencer.styleId);
  const patternSummary = summarizePatternChange(
    sequencer.styleId,
    sequencer.pattern,
  );
  const laneHitCounts = Object.fromEntries(
    INSTRUMENT_ORDER.map((instrument) => [
      instrument,
      sequencer.pattern[instrument].filter(Boolean).length,
    ]),
  );

  const arrangementContext = arrangement
    ? {
      arrangementBars: getArrangementBarCount(arrangement),
      arrangementSections: Object.fromEntries(
        arrangement.sections.map((section) => [section.id, section.bars]),
      ),
    }
    : {};

  return {
    styleId: sequencer.styleId,
    styleName: style.name,
    bpm: sequencer.bpm,
    swingPercent: getSwingPercent(sequencer.swing),
    activeSteps: countActiveSteps(sequencer.pattern),
    densityLevel: patternSummary.densityLevel,
    densitySummary: patternSummary.densitySummary,
    pocketSummary: patternSummary.pocketSummary,
    tryThis: styleCoach.tryThis,
    activeLanes: INSTRUMENT_ORDER.filter(
      (instrument) => laneHitCounts[instrument] > 0,
    ),
    laneHitCounts,
    ...arrangementContext,
  };
}
