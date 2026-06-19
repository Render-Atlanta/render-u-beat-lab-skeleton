export type HistoryShortcut = "undo" | "redo";

export function getHistoryShortcut(event: KeyboardEvent): HistoryShortcut | null {
  if (isEditableTarget(event.target)) {
    return null;
  }

  const key = event.key.toLowerCase();
  const isModified = event.metaKey || event.ctrlKey;
  if (!isModified) {
    return null;
  }

  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }

  if (key === "y") {
    return "redo";
  }

  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as
    | { tagName?: string; isContentEditable?: boolean }
    | null;
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName ?? "");
}
