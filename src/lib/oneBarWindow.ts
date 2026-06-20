/**
 * Choose the start of the most onset-dense one-bar window within a track.
 * Each onset is treated as a candidate downbeat (clamped so the window stays
 * inside the track); the window capturing the most onsets wins.
 */
export function pickOneBarWindow(
  onsetTimesMs: number[],
  barMs: number,
  totalDurationMs: number,
): { startMs: number; endMs: number } {
  if (barMs >= totalDurationMs || onsetTimesMs.length === 0) {
    return { startMs: 0, endMs: Math.min(barMs, totalDurationMs) };
  }
  const sorted = [...onsetTimesMs].sort((a, b) => a - b);
  const maxStart = totalDurationMs - barMs;
  let best = { startMs: 0, count: -1 };
  for (const onset of sorted) {
    const startMs = Math.min(Math.max(0, onset), maxStart);
    const endMs = startMs + barMs;
    const count = sorted.filter((t) => t >= startMs && t < endMs).length;
    if (count > best.count) best = { startMs, count };
  }
  return { startMs: best.startMs, endMs: best.startMs + barMs };
}
