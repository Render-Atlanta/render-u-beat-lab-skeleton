import type { InstrumentId } from "./patterns";

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
  /** Short role tag, e.g. "Pulse". */
  role: string;
  /** One-line, beginner-first explanation of what the sound does. */
  explainer: string;
  /** A concrete interaction hint shown in guided mode ("try it here"). */
  guidedTip: string;
}

export const INSTRUMENTS: InstrumentOption[] = [
  {
    id: "kick",
    label: "Kick",
    role: "Pulse",
    explainer: "The heartbeat — low boom that lands on the main beats.",
    guidedTip: "Lands on the main beats — the pulse everything else answers to.",
  },
  {
    id: "snare",
    label: "Snare",
    role: "Backbeat",
    explainer: "The clap/crack that answers the kick, usually on beats 2 and 4.",
    guidedTip: "Put it on beats 2 and 4 to answer the kick. Tap those two first.",
  },
  {
    id: "hat",
    label: "Hat",
    role: "Subdivision",
    explainer: "The fast ticks that keep time between the kick and snare.",
    guidedTip: "Fills the gaps. Every step = busy; every other step = laid back.",
  },
  {
    id: "openHat",
    label: "Open",
    role: "Accent",
    explainer: "A longer, sizzling hat that adds lift and movement.",
    guidedTip: "One or two per bar adds lift — great right before the next bar.",
  },
  {
    id: "clap",
    label: "Clap",
    role: "Layer",
    explainer: "A wide hand-clap that thickens the snare on the backbeat.",
    guidedTip: "Stack it on the snare to fatten the backbeat.",
  },
  {
    id: "808",
    label: "808",
    role: "Bass",
    explainer: "The deep sub-bass boom that gives the beat its low-end weight.",
    guidedTip: "The sub-bass. Pitch it to follow your root note for movement.",
  },
  {
    id: "bassGuitar",
    label: "Bass Gtr",
    role: "Bassline",
    explainer:
      "A plucked electric bass that adds melodic low-end groove above the 808 sub.",
    guidedTip:
      "Follows your root note on the 808 hits — nudge a step's pitch to walk the bassline.",
  },
  {
    id: "melody",
    label: "Melody",
    role: "Lead",
    explainer: "An optional in-key synth line for hooks, riffs, and simple motifs.",
    guidedTip: "An in-key hook. A few notes go a long way.",
  },
];
