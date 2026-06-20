export function isMetronomeQuarterNote(stepIndex: number | null): stepIndex is number {
  return stepIndex !== null && stepIndex % 4 === 0;
}

export function getMetronomeClickAccent(stepIndex: number): boolean {
  return stepIndex % 4 === 0 && stepIndex % 16 === 0;
}

export function shouldPulseMetronomeDot(
  metronomeEnabled: boolean,
  stepIndex: number | null,
): boolean {
  return metronomeEnabled && isMetronomeQuarterNote(stepIndex);
}
