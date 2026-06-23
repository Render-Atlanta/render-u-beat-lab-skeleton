import {
  applySectionMutes,
  getArrangementBarCount,
  type Arrangement,
  type ArrangementSectionId,
} from "./arrangement";
import type { BeatStyle } from "./beatStyles";
import type { SequencerState } from "./patternState";
import type { InstrumentId } from "./patterns";
import { createPlayableStyle } from "./sequencerDomain";

/**
 * Where the live "Play as song" scheduler currently is: which arrangement
 * section is sounding, its lane mutes, and the 1-based bar position within the
 * whole song. Pure data — derived from the arrangement and a bar counter, with
 * no audio dependency.
 */
export interface SongPosition {
  sectionId: ArrangementSectionId;
  label: string;
  /** 1-based bar index across the entire song (1..totalBars). */
  barInSong: number;
  /** Total bars in the song (sum of every section's bars). */
  totalBars: number;
  mutedLanes: InstrumentId[];
}

/**
 * Map a count of elapsed bars onto the looping arrangement: each `15 → 0` engine
 * wrap is one bar, and the song repeats forever, so `barsElapsed` is taken
 * modulo the total bar count before locating the section it falls in.
 */
export function getSongPosition(
  arrangement: Arrangement,
  barsElapsed: number,
): SongPosition {
  const totalBars = getArrangementBarCount(arrangement);
  // Guard against an empty arrangement (not reachable today — every section has
  // at least one bar — but keeps the function total rather than dividing by 0).
  if (totalBars <= 0) {
    const first = arrangement.sections[0];
    return {
      sectionId: first.id,
      label: first.label,
      barInSong: 1,
      totalBars: 0,
      mutedLanes: [...first.mutedLanes],
    };
  }

  const barIndex = ((barsElapsed % totalBars) + totalBars) % totalBars;

  let cursor = 0;
  for (const section of arrangement.sections) {
    if (barIndex < cursor + section.bars) {
      return {
        sectionId: section.id,
        label: section.label,
        barInSong: barIndex + 1,
        totalBars,
        mutedLanes: [...section.mutedLanes],
      };
    }
    cursor += section.bars;
  }

  // Unreachable: barIndex < totalBars guarantees a section above. Fall back to
  // the last section so the return type stays non-optional.
  const last = arrangement.sections[arrangement.sections.length - 1];
  return {
    sectionId: last.id,
    label: last.label,
    barInSong: totalBars,
    totalBars,
    mutedLanes: [...last.mutedLanes],
  };
}

/**
 * Build the audible `BeatStyle` for one song section by silencing its muted
 * lanes — the same masking the offline export uses, composed onto the live
 * playable style. Pure: the source sequencer pattern is never mutated.
 */
export function createSongSectionStyle(
  sequencer: SequencerState,
  mutedLanes: InstrumentId[],
): BeatStyle {
  const pattern = applySectionMutes(sequencer.pattern, { mutedLanes });
  return createPlayableStyle({ ...sequencer, pattern });
}

/** The "{Section · bar N/total}" string shared by the indicator and transport label. */
export function formatSongPosition(position: SongPosition): string {
  return `${position.label} · bar ${position.barInSong}/${position.totalBars}`;
}

/**
 * True only at a loop wrap: a step *decrease* between two real step indices
 * (e.g. 15 → 0). A null on either side — playback start, or the brief gap after
 * a restart when no step is scheduled yet — is never a wrap, so the song's bar
 * counter cannot advance spuriously on those transitions.
 */
export function isLoopWrap(
  previousStep: number | null,
  nextStep: number | null,
): boolean {
  return previousStep !== null && nextStep !== null && nextStep < previousStep;
}

/**
 * If the bar *after* `barsElapsed` begins a different section, return that next
 * section's position; otherwise null. Used to queue the upcoming section's
 * masked style one bar ahead so the engine can swap it in exactly at the loop
 * boundary (correct downbeat, no phase-resetting restart). Wraps the song.
 */
export function getUpcomingSectionChange(
  arrangement: Arrangement,
  barsElapsed: number,
): SongPosition | null {
  const current = getSongPosition(arrangement, barsElapsed);
  const next = getSongPosition(arrangement, barsElapsed + 1);
  return next.sectionId === current.sectionId ? null : next;
}
