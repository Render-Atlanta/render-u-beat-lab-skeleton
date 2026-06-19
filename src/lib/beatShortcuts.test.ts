import { describe, expect, it } from "vitest";
import { getHistoryShortcut } from "./beatShortcuts";

describe("beat history keyboard shortcuts", () => {
  it("maps undo and redo shortcuts", () => {
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true }))).toBe("undo");
    expect(getHistoryShortcut(keyEvent("z", { ctrlKey: true }))).toBe("undo");
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true, shiftKey: true }))).toBe(
      "redo",
    );
    expect(getHistoryShortcut(keyEvent("y", { ctrlKey: true }))).toBe("redo");
    expect(getHistoryShortcut(keyEvent("y", { metaKey: true }))).toBe("redo");
  });

  it("ignores shortcuts while typing in editable fields", () => {
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true, tagName: "INPUT" }))).toBeNull();
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true, tagName: "TEXTAREA" }))).toBeNull();
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true, tagName: "SELECT" }))).toBeNull();
    expect(getHistoryShortcut(keyEvent("z", { metaKey: true, isContentEditable: true }))).toBeNull();
  });
});

function keyEvent(
  key: string,
  options: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    tagName?: string;
    isContentEditable?: boolean;
  },
) {
  return {
    key,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    target: {
      tagName: options.tagName ?? "BUTTON",
      isContentEditable: options.isContentEditable ?? false,
    },
  } as unknown as KeyboardEvent;
}
