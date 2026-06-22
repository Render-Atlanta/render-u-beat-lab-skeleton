export interface DemoModeStep {
  id: "style" | "fill" | "arrange" | "tag" | "export";
  label: string;
  detail: string;
  actionLabel: string;
}

export const DEMO_MODE_STEPS: DemoModeStep[] = [
  {
    id: "style",
    label: "Make it bounce",
    detail: "Switch to the high-energy workshop groove.",
    actionLabel: "Bounce",
  },
  {
    id: "fill",
    label: "Add a fill",
    detail: "Drop in a one-bar turnaround.",
    actionLabel: "Fill",
  },
  {
    id: "arrange",
    label: "Extend main",
    detail: "Make the main section long enough to present.",
    actionLabel: "Extend",
  },
  {
    id: "tag",
    label: "Cue producer tag",
    detail: "Prep the tag and jump to the tag controls.",
    actionLabel: "Tag",
  },
  {
    id: "export",
    label: "Export project",
    detail: "Generate the project JSON and open Arrange.",
    actionLabel: "Export",
  },
];

export function advanceDemoStepIndex(
  currentIndex: number,
  stepId: DemoModeStep["id"],
  steps: DemoModeStep[] = DEMO_MODE_STEPS,
): number {
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) {
    return currentIndex;
  }
  return Math.max(currentIndex, index + 1);
}
