/**
 * Map raw analyser frequency bytes to `barCount` display bars in 0..1.
 *
 * Bins are grouped on a roughly logarithmic scale (exponential bin edges) so
 * that the bass-heavy low bins do not swamp the display and high-frequency
 * content stays visible. Each bar is the average of its bin group, divided by
 * 255 to normalize.
 */
export function mapFrequencyBars(data: Uint8Array, barCount: number): number[] {
  // Normalize to a finite, non-negative integer so `new Array()` below can
  // never throw a RangeError on a fractional/NaN barCount.
  const safeBarCount = Number.isFinite(barCount) ? Math.max(0, Math.floor(barCount)) : 0;
  if (safeBarCount <= 0 || data.length === 0) {
    return new Array(safeBarCount).fill(0);
  }

  const bars: number[] = [];
  for (let bar = 0; bar < safeBarCount; bar += 1) {
    const start = binEdge(bar, safeBarCount, data.length);
    const end = binEdge(bar + 1, safeBarCount, data.length);
    const lo = Math.min(start, data.length - 1);
    const hi = Math.max(lo + 1, end);

    let sum = 0;
    let count = 0;
    for (let i = lo; i < hi && i < data.length; i += 1) {
      sum += data[i];
      count += 1;
    }
    bars.push(count === 0 ? 0 : sum / count / 255);
  }
  return bars;
}

function binEdge(bar: number, barCount: number, binCount: number): number {
  // Exponential edges from bin 0 to the last bin → log-ish frequency spread.
  const fraction = bar / barCount;
  return Math.floor((Math.pow(binCount + 1, fraction) - 1));
}
