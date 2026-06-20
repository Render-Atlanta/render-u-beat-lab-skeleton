import type { PaletteEntry } from "../lib/stepPitch";

interface StepPitchSelectProps {
  label: string;
  stepIndex: number;
  degree: number;
  palette: PaletteEntry[];
  onChange: (stepIndex: number, degree: number) => void;
}

/**
 * The in-key pitch picker shown on an active step of a pitched lane
 * (808 sub, bass guitar, or melody).
 */
export function StepPitchSelect({
  label,
  stepIndex,
  degree,
  palette,
  onChange,
}: StepPitchSelectProps) {
  const entry = palette[degree];
  return (
    <label className="step-pitch">
      <span className="sr-only">{`${label} step ${stepIndex + 1} note`}</span>
      <select
        className={`step-pitch__select pitch-${entry?.function ?? "root"}`}
        value={degree}
        aria-label={`${label} step ${stepIndex + 1} note`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(stepIndex, Number(event.target.value))}
      >
        {palette.map((option) => (
          <option key={option.degree} value={option.degree}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
