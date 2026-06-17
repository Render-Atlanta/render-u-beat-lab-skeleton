import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it } from "vitest";
import { BEAT_STYLES, type BeatStyleId } from "../lib/beatStyles";
import { StyleSelector } from "./StyleSelector";

interface InspectableProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-pressed"?: boolean;
  "data-style-id"?: BeatStyleId;
}

describe("StyleSelector", () => {
  it("marks the active style and calls back when a style is selected", () => {
    const selected: BeatStyleId[] = [];
    const element = StyleSelector({
      styles: Object.values(BEAT_STYLES),
      selectedStyleId: "trap",
      onSelectStyle: (styleId) => selected.push(styleId),
    });

    const trapButton = findStyleButton(element, "trap");
    const afrobeatsButton = findStyleButton(element, "afrobeats");

    expect(trapButton.props["aria-pressed"]).toBe(true);
    expect(trapButton.props.className).toContain("active");
    expect(afrobeatsButton.props["aria-pressed"]).toBe(false);

    afrobeatsButton.props.onClick?.();

    expect(selected).toEqual(["afrobeats"]);
  });
});

function findStyleButton(
  node: ReactNode,
  styleId: BeatStyleId,
): ReactElement<InspectableProps> {
  if (isValidElement<InspectableProps>(node)) {
    if (node.props["data-style-id"] === styleId) {
      return node;
    }

    for (const child of Children.toArray(node.props.children)) {
      const match = findOptionalStyleButton(child, styleId);
      if (match) {
        return match;
      }
    }
  }

  throw new Error(`Could not find style button for ${styleId}`);
}

function findOptionalStyleButton(
  node: ReactNode,
  styleId: BeatStyleId,
): ReactElement<InspectableProps> | null {
  try {
    return findStyleButton(node, styleId);
  } catch {
    return null;
  }
}
