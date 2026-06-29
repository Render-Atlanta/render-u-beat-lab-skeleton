import { getLaneVoiceOptions } from "../lib/instrumentVoices";
import type { LaneVoiceId, VoicedLane } from "../lib/laneVoiceSelection";

const LANE_LABEL: Record<VoicedLane, string> = {
  melody: "Melody voice",
  bassGuitar: "Bass voice",
};

export function LaneVoicePicker({
  lane,
  value,
  onChange,
}: {
  lane: VoicedLane;
  value: LaneVoiceId;
  onChange: (lane: VoicedLane, id: LaneVoiceId) => void;
}) {
  const label = LANE_LABEL[lane];
  return (
    <label className="control-field engine-field">
      <span className="eyebrow">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(lane, event.target.value)}
      >
        {getLaneVoiceOptions(lane).map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </label>
  );
}
