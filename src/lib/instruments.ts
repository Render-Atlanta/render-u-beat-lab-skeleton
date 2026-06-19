import type { InstrumentId } from "./patterns";

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
  /** Short role tag, e.g. "Pulse". */
  role: string;
  /** One-line, beginner-first explanation of what the sound does. */
  explainer: string;
}

export const INSTRUMENTS: InstrumentOption[] = [
  {
    id: "kick",
    label: "Kick",
    role: "Pulse",
    explainer: "The heartbeat — low boom that lands on the main beats.",
  },
  {
    id: "snare",
    label: "Snare",
    role: "Backbeat",
    explainer: "The clap/crack that answers the kick, usually on beats 2 and 4.",
  },
  {
    id: "hat",
    label: "Hat",
    role: "Subdivision",
    explainer: "The fast ticks that keep time between the kick and snare.",
  },
  {
    id: "openHat",
    label: "Open",
    role: "Accent",
    explainer: "A longer, sizzling hat that adds lift and movement.",
  },
  {
    id: "clap",
    label: "Clap",
    role: "Layer",
    explainer: "A wide hand-clap that thickens the snare on the backbeat.",
  },
  {
    id: "808",
    label: "808",
    role: "Bass",
    explainer: "The deep sub-bass boom that gives the beat its low-end weight.",
  },
];
