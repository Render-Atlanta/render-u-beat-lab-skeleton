import { describe, expect, it } from "vitest";
import { isCommandAction, type CommandAction } from "./commandActions";

describe("isCommandAction", () => {
  it("accepts a valid selectStyle action", () => {
    const action: CommandAction = { kind: "selectStyle", styleId: "bounce" };
    expect(isCommandAction(action)).toBe(true);
  });

  it("rejects an object with an unknown kind", () => {
    expect(isCommandAction({ kind: "explode" })).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(isCommandAction("setTempo")).toBe(false);
    expect(isCommandAction(null)).toBe(false);
  });

  it("rejects malformed known kinds", () => {
    expect(isCommandAction({ kind: "setTempo", mode: "absolute" })).toBe(false);
    expect(isCommandAction({ kind: "setTempo", mode: "relative", bpm: 120 })).toBe(false);
    expect(isCommandAction({ kind: "setSwing", mode: "absolute", swingPercent: "10" })).toBe(false);
    expect(isCommandAction({ kind: "selectStyle", styleId: "bogus" })).toBe(false);
    expect(isCommandAction({ kind: "unknown" })).toBe(false);
  });
});
