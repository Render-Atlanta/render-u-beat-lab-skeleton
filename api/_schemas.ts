export const COMMAND_ACTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["selectStyle", "setTempo", "setSwing", "unknown"],
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
  },
  required: ["answer"],
} as const;
