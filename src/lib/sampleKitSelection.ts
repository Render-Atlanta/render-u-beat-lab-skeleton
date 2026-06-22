export const SAMPLE_KIT_IDS = ["classic", "punchy", "airy"] as const;
export type SampleKitId = (typeof SAMPLE_KIT_IDS)[number];

export const DEFAULT_SAMPLE_KIT_ID: SampleKitId = "classic";

export function isSampleKitId(value: unknown): value is SampleKitId {
  return (
    typeof value === "string" &&
    (SAMPLE_KIT_IDS as readonly string[]).includes(value)
  );
}

export function normalizeSampleKitId(value: unknown): SampleKitId {
  return isSampleKitId(value) ? value : DEFAULT_SAMPLE_KIT_ID;
}
