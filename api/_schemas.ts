export const COMMAND_ACTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "selectStyle",
            "setTempo",
            "setSwing",
            "setLaneMute",
            "adjustLaneDensity",
            "addFill",
            "setSectionBars",
            "adjustArrangementBars",
            "doubleArrangement",
            "unknown",
          ],
        },
        styleId: {
          type: "string",
          enum: [
            "trap",
            "crunk",
            "drill",
            "rnb",
            "pop",
            "afrobeats",
            "amapiano",
            "house",
            "bounce",
          ],
        },
        mode: {
          type: "string",
          enum: ["absolute", "relative"],
        },
        bpm: { type: "number" },
        deltaBpm: { type: "number" },
        swingPercent: { type: "number" },
        deltaPercent: { type: "number" },
        instrumentId: {
          type: "string",
          enum: [
            "kick",
            "snare",
            "hat",
            "openHat",
            "clap",
            "808",
            "bassGuitar",
            "melody",
          ],
        },
        muted: { type: "boolean" },
        direction: {
          type: "string",
          enum: ["busier", "sparser"],
        },
        sectionId: {
          type: "string",
          enum: ["intro", "main", "variation", "outro"],
        },
        bars: { type: "number" },
        deltaBars: { type: "number" },
        reason: { type: "string" },
      },
      required: ["kind"],
    },
  },
  required: ["action"],
} as const;

export const COACH_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "A concise, beginner-friendly answer grounded in the beat context.",
    },
    action: COMMAND_ACTION_RESPONSE_SCHEMA.properties.action,
  },
  required: ["answer"],
} as const;
