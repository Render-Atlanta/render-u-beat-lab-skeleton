import type { InstrumentId } from "./patterns";

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
}

export const INSTRUMENTS: InstrumentOption[] = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hat" },
  { id: "openHat", label: "Open" },
];
