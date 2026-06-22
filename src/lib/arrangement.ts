import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { INSTRUMENT_ORDER, clonePattern, cloneSequencerState, type SequencerState } from "./patternState";
import { type InstrumentId, type Pattern } from "./patterns";
import { normalizeLaneVolumes } from "./laneVolumes";
import { createDefaultLaneMutes } from "./laneMutes";
import { normalizeBassStepPitches, normalizeMelodyStepPitches } from "./stepPitch";
import { normalizeBassGuitarStepPitches } from "./bassGuitarPitch";
import { normalizeStepVelocities } from "./stepVelocity";
import { normalizeMixEffects } from "./mixEffects";
import {
  DEFAULT_SAMPLE_KIT_ID,
  isSampleKitId,
} from "./sampleKitSelection";
import {
  normalizeProducerTagConfig,
  type ProducerTagConfig,
  type ProducerTagConfigInput,
  type ProducerTagEffects,
  type ProducerTagSource,
  type ProducerTagTrigger,
} from "./producerTag";

export const PROJECT_EXPORT_KIND = "render-u-beat-lab/project";
export const PROJECT_EXPORT_VERSION = 1;

export const ARRANGEMENT_SECTION_IDS = [
  "intro",
  "main",
  "variation",
  "outro",
] as const;
export const ARRANGEMENT_MIN_BARS = 1;
export const ARRANGEMENT_MAX_BARS = 16;

export type ArrangementSectionId = (typeof ARRANGEMENT_SECTION_IDS)[number];

export interface ArrangementSection {
  id: ArrangementSectionId;
  label: string;
  bars: number;
  mutedLanes: InstrumentId[];
}

export interface Arrangement {
  sections: ArrangementSection[];
}

export interface ArrangementPlaybackSection extends ArrangementSection {
  pattern: Pattern;
}

export interface BeatLabProject {
  kind: typeof PROJECT_EXPORT_KIND;
  version: typeof PROJECT_EXPORT_VERSION;
  sequencer: SequencerState;
  producerTag: ProducerTagConfig;
  arrangement: Arrangement;
}

export type ProjectImportResult =
  | { ok: true; project: BeatLabProject }
  | { ok: false; errors: string[] };

export interface ProjectJsonOptions {
  pretty?: boolean;
}

const SECTION_LABELS: Record<ArrangementSectionId, string> = {
  intro: "Intro",
  main: "Main",
  variation: "Variation",
  outro: "Outro",
};

const DEFAULT_MUTED_LANES: Record<ArrangementSectionId, InstrumentId[]> = {
  intro: ["snare", "openHat"],
  main: [],
  variation: ["kick"],
  outro: ["hat", "openHat"],
};

export function createDefaultArrangement(): Arrangement {
  return {
    sections: ARRANGEMENT_SECTION_IDS.map((id) => ({
      id,
      label: SECTION_LABELS[id],
      bars: 1,
      mutedLanes: [...DEFAULT_MUTED_LANES[id]],
    })),
  };
}

export function createBeatLabProject(input: {
  sequencer: SequencerState;
  producerTag?: ProducerTagConfigInput;
  arrangement?: Arrangement;
}): BeatLabProject {
  return {
    kind: PROJECT_EXPORT_KIND,
    version: PROJECT_EXPORT_VERSION,
    sequencer: cloneSequencerState(input.sequencer),
    producerTag: normalizeProducerTagConfig(input.producerTag),
    arrangement: cloneArrangement(input.arrangement ?? createDefaultArrangement()),
  };
}

export function cloneArrangement(arrangement: Arrangement): Arrangement {
  return {
    sections: arrangement.sections.map((section) => ({
      ...section,
      mutedLanes: [...section.mutedLanes],
    })),
  };
}

export function isLaneMutedInSection(
  arrangement: Arrangement,
  sectionId: ArrangementSectionId,
  instrument: InstrumentId,
): boolean {
  return getSection(arrangement, sectionId).mutedLanes.includes(instrument);
}

export function setSectionLaneMuted(
  arrangement: Arrangement,
  sectionId: ArrangementSectionId,
  instrument: InstrumentId,
  muted: boolean,
): Arrangement {
  return {
    sections: arrangement.sections.map((section) => {
      if (section.id !== sectionId) {
        return {
          ...section,
          mutedLanes: [...section.mutedLanes],
        };
      }

      const mutedSet = new Set(section.mutedLanes);
      if (muted) {
        mutedSet.add(instrument);
      } else {
        mutedSet.delete(instrument);
      }

      return {
        ...section,
        mutedLanes: orderedMutedLanes([...mutedSet]),
      };
    }),
  };
}

export function toggleSectionLaneMute(
  arrangement: Arrangement,
  sectionId: ArrangementSectionId,
  instrument: InstrumentId,
): Arrangement {
  return setSectionLaneMuted(
    arrangement,
    sectionId,
    instrument,
    !isLaneMutedInSection(arrangement, sectionId, instrument),
  );
}

export function normalizeArrangementBars(bars: number): number {
  if (!Number.isFinite(bars)) {
    return ARRANGEMENT_MIN_BARS;
  }
  return Math.max(
    ARRANGEMENT_MIN_BARS,
    Math.min(ARRANGEMENT_MAX_BARS, Math.round(bars)),
  );
}

export function setSectionBars(
  arrangement: Arrangement,
  sectionId: ArrangementSectionId,
  bars: number,
): Arrangement {
  const normalizedBars = normalizeArrangementBars(bars);
  return {
    sections: arrangement.sections.map((section) =>
      section.id === sectionId
        ? { ...section, bars: normalizedBars, mutedLanes: [...section.mutedLanes] }
        : { ...section, mutedLanes: [...section.mutedLanes] },
    ),
  };
}

export function getArrangementBarCount(arrangement: Arrangement): number {
  return arrangement.sections.reduce((total, section) => total + section.bars, 0);
}

export function getArrangementDurationSeconds(
  arrangement: Arrangement,
  bpm: number,
): number {
  return getArrangementBarCount(arrangement) * 4 * (60 / bpm);
}

export function applySectionMutes(
  pattern: Pattern,
  section: Pick<ArrangementSection, "mutedLanes">,
): Pattern {
  const next = clonePattern(pattern);
  for (const instrument of section.mutedLanes) {
    next[instrument] = next[instrument].map(() => false);
  }
  return next;
}

export function createArrangementPlaybackSections(
  sequencer: SequencerState,
  arrangement: Arrangement,
): ArrangementPlaybackSection[] {
  return arrangement.sections.map((section) => ({
    ...section,
    mutedLanes: [...section.mutedLanes],
    pattern: applySectionMutes(sequencer.pattern, section),
  }));
}

export function exportProjectJson(
  project: BeatLabProject,
  options: ProjectJsonOptions = {},
): string {
  const normalized = reconstructProjectState(project);
  return JSON.stringify(normalized, null, options.pretty === false ? 0 : 2);
}

export function importProjectJson(json: string): ProjectImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["Project JSON could not be parsed."] };
  }

  return validateProjectExport(parsed);
}

export function validateProjectExport(value: unknown): ProjectImportResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ["Project must be a JSON object."] };
  }

  if (value.kind !== PROJECT_EXPORT_KIND) {
    errors.push(`Project kind must be "${PROJECT_EXPORT_KIND}".`);
  }

  if (value.version !== PROJECT_EXPORT_VERSION) {
    errors.push(`Project version must be ${PROJECT_EXPORT_VERSION}.`);
  }

  const sequencer = readSequencerState(value.sequencer, errors);
  const producerTag = readProducerTagConfig(value.producerTag, errors);
  const arrangement = readArrangement(value.arrangement, errors);

  if (errors.length > 0 || !sequencer || !producerTag || !arrangement) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    project: {
      kind: PROJECT_EXPORT_KIND,
      version: PROJECT_EXPORT_VERSION,
      sequencer,
      producerTag,
      arrangement,
    },
  };
}

export function reconstructProjectState(project: BeatLabProject): BeatLabProject {
  const result = validateProjectExport(project);

  if (!result.ok) {
    throw new Error(`Invalid project export: ${result.errors.join(" ")}`);
  }

  return result.project;
}

function readSequencerState(value: unknown, errors: string[]): SequencerState | null {
  if (!isRecord(value)) {
    errors.push("Sequencer must be an object.");
    return null;
  }

  const styleId = readBeatStyleId(value.styleId, errors, "Sequencer styleId");
  const bpm = readIntegerInRange(value.bpm, 60, 180, errors, "Sequencer bpm");
  const swing = readNumberInRange(value.swing, 0, 0.3, errors, "Sequencer swing");
  const pattern = readPattern(value.pattern, errors, "Sequencer pattern");
  const laneVolumes = readLaneVolumes(value.laneVolumes, errors);
  const laneMutes = readLaneMutes(value.laneMutes, errors);
  const sampleKitId = readSampleKitId(value.sampleKitId, errors);
  const mixEffects = readMixEffects(value.mixEffects, errors);
  const stepVelocities = readStepVelocities(value.stepVelocities, errors);
  const bassStepPitches = readBassStepPitches(value.bassStepPitches, errors);
  const bassGuitarStepPitches = readBassGuitarStepPitches(
    value.bassGuitarStepPitches,
    errors,
  );
  const melodyStepPitches = readMelodyStepPitches(value.melodyStepPitches, errors);

  if (
    !styleId ||
    bpm === null ||
    swing === null ||
    !pattern ||
    !laneVolumes ||
    !laneMutes ||
    !sampleKitId ||
    !mixEffects ||
    !stepVelocities ||
    !bassStepPitches ||
    !bassGuitarStepPitches ||
    !melodyStepPitches
  ) {
    return null;
  }

  return {
    styleId,
    bpm,
    swing,
    pattern,
    laneVolumes,
    laneMutes,
    sampleKitId,
    mixEffects,
    stepVelocities,
    bassStepPitches,
    bassGuitarStepPitches,
    melodyStepPitches,
  };
}

function readSampleKitId(value: unknown, errors: string[]) {
  if (value === undefined) {
    return DEFAULT_SAMPLE_KIT_ID;
  }

  if (!isSampleKitId(value)) {
    errors.push("Sequencer sampleKitId must be classic, punchy, or airy.");
    return null;
  }

  return value;
}

function readMixEffects(value: unknown, errors: string[]) {
  if (value === undefined) {
    return normalizeMixEffects();
  }

  if (!isRecord(value)) {
    errors.push("Sequencer mixEffects must be an object.");
    return null;
  }

  const space = readNumberInRange(value.space, 0, 1, errors, "Sequencer mixEffects.space");
  const echo = readNumberInRange(value.echo, 0, 1, errors, "Sequencer mixEffects.echo");

  if (space === null || echo === null) {
    return null;
  }

  return normalizeMixEffects({ space, echo });
}

function readStepVelocities(value: unknown, errors: string[]) {
  if (value === undefined) {
    return normalizeStepVelocities();
  }

  if (!isRecord(value)) {
    errors.push("Sequencer stepVelocities must be an object.");
    return null;
  }

  const rows = Object.fromEntries(
    INSTRUMENT_ORDER.map((instrument) => [instrument, value[instrument]]),
  );

  for (const instrument of INSTRUMENT_ORDER) {
    const row = rows[instrument];
    if (row === undefined) {
      continue;
    }

    if (!Array.isArray(row) || row.length !== 16) {
      errors.push(`Sequencer stepVelocities.${instrument} must be an array of 16 entries.`);
      return null;
    }

    for (let index = 0; index < row.length; index += 1) {
      const velocity = row[index];
      if (
        typeof velocity !== "number" ||
        !Number.isInteger(velocity) ||
        velocity < 0 ||
        velocity > 2
      ) {
        errors.push(
          `Sequencer stepVelocities.${instrument}[${index}] must be an integer from 0 to 2.`,
        );
        return null;
      }
    }
  }

  return normalizeStepVelocities(rows);
}

function readMelodyStepPitches(value: unknown, errors: string[]) {
  return readPitchArray(
    value,
    errors,
    "melodyStepPitches",
    normalizeMelodyStepPitches,
  );
}

function readBassStepPitches(value: unknown, errors: string[]) {
  return readPitchArray(value, errors, "bassStepPitches", normalizeBassStepPitches);
}

function readBassGuitarStepPitches(value: unknown, errors: string[]) {
  return readPitchArray(
    value,
    errors,
    "bassGuitarStepPitches",
    normalizeBassGuitarStepPitches,
  );
}

function readPitchArray(
  value: unknown,
  errors: string[],
  fieldName: string,
  normalize: (value: unknown) => number[],
) {
  if (value === undefined) {
    return normalize(undefined);
  }

  if (!Array.isArray(value)) {
    errors.push(`Sequencer ${fieldName} must be an array.`);
    return null;
  }

  if (value.length !== 16) {
    errors.push(`Sequencer ${fieldName} must contain 16 entries.`);
    return null;
  }

  for (let index = 0; index < value.length; index += 1) {
    const degree = value[index];
    if (typeof degree !== "number" || !Number.isInteger(degree) || degree < 0 || degree > 6) {
      errors.push(`Sequencer ${fieldName}[${index}] must be an integer from 0 to 6.`);
      return null;
    }
  }

  return normalize(value);
}

function readLaneVolumes(value: unknown, errors: string[]) {
  if (value === undefined) {
    return normalizeLaneVolumes();
  }

  if (!isRecord(value)) {
    errors.push("Sequencer laneVolumes must be an object.");
    return null;
  }

  const entries = INSTRUMENT_ORDER.map((instrument) => {
    const laneVolume = value[instrument];
    if (laneVolume === undefined) {
      return [instrument, 1] as const;
    }

    const normalized = readNumberInRange(
      laneVolume,
      0,
      1.5,
      errors,
      `Sequencer laneVolumes.${instrument}`,
    );
    if (normalized === null) {
      return null;
    }

    return [instrument, normalized] as const;
  });

  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return normalizeLaneVolumes(
    Object.fromEntries(entries as Array<readonly [InstrumentId, number]>),
  );
}

function readLaneMutes(value: unknown, errors: string[]) {
  if (value === undefined) {
    return createDefaultLaneMutes();
  }

  if (!isRecord(value)) {
    errors.push("Sequencer laneMutes must be an object.");
    return null;
  }

  const mutes = createDefaultLaneMutes();
  for (const instrument of INSTRUMENT_ORDER) {
    const muted = value[instrument];
    if (muted === undefined) {
      continue;
    }
    if (typeof muted !== "boolean") {
      errors.push(`Sequencer laneMutes.${instrument} must be a boolean.`);
      return null;
    }
    mutes[instrument] = muted;
  }

  return mutes;
}

function getSection(
  arrangement: Arrangement,
  sectionId: ArrangementSectionId,
): ArrangementSection {
  const section = arrangement.sections.find((candidate) => candidate.id === sectionId);
  if (!section) {
    throw new Error(`Unknown arrangement section: ${sectionId}`);
  }
  return section;
}

function readProducerTagConfig(
  value: unknown,
  errors: string[],
): ProducerTagConfig | null {
  if (!isRecord(value)) {
    errors.push("Producer tag must be an object.");
    return null;
  }

  const enabled = readBoolean(value.enabled, errors, "Producer tag enabled");
  const text = readString(value.text, errors, "Producer tag text");
  const trigger = readProducerTagTrigger(value.trigger, errors);
  const effects = readProducerTagEffects(value.effects, errors);
  const source = readProducerTagSource(value.source, errors);

  if (
    enabled === null ||
    text === null ||
    trigger === null ||
    effects === null ||
    source === null
  ) {
    return null;
  }

  return normalizeProducerTagConfig({
    enabled,
    text,
    trigger,
    effects,
    source,
  });
}

function readProducerTagEffects(
  value: unknown,
  errors: string[],
): ProducerTagEffects | null {
  if (!isRecord(value)) {
    errors.push("Producer tag effects must be an object.");
    return null;
  }

  const rate = readNumberInRange(value.rate, 0.5, 1.5, errors, "Producer tag rate");
  const pitch = readNumberInRange(value.pitch, 0, 2, errors, "Producer tag pitch");
  const volume = readNumberInRange(value.volume, 0, 1, errors, "Producer tag volume");

  if (rate === null || pitch === null || volume === null) {
    return null;
  }

  return { rate, pitch, volume };
}

function readArrangement(value: unknown, errors: string[]): Arrangement | null {
  if (!isRecord(value)) {
    errors.push("Arrangement must be an object.");
    return null;
  }

  if (!Array.isArray(value.sections)) {
    errors.push("Arrangement sections must be an array.");
    return null;
  }

  const sections = value.sections
    .map((section, index) => readArrangementSection(section, errors, index))
    .filter((section): section is ArrangementSection => section !== null);
  const ids = new Set(sections.map((section) => section.id));

  for (const sectionId of ARRANGEMENT_SECTION_IDS) {
    if (!ids.has(sectionId)) {
      errors.push(`Arrangement is missing ${sectionId} section.`);
    }
  }

  if (ids.size !== sections.length) {
    errors.push("Arrangement sections must not contain duplicate ids.");
  }

  if (errors.length > 0) {
    return null;
  }

  return {
    sections: ARRANGEMENT_SECTION_IDS.map((id) => {
      const section = sections.find((candidate) => candidate.id === id);
      if (!section) {
        throw new Error(`Validated arrangement is missing section: ${id}`);
      }
      return section;
    }),
  };
}

function readArrangementSection(
  value: unknown,
  errors: string[],
  index: number,
): ArrangementSection | null {
  const path = `Arrangement section ${index + 1}`;

  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  const id = readArrangementSectionId(value.id, errors, `${path} id`);
  const label = readString(value.label, errors, `${path} label`);
  const bars = readIntegerInRange(
    value.bars,
    ARRANGEMENT_MIN_BARS,
    ARRANGEMENT_MAX_BARS,
    errors,
    `${path} bars`,
  );
  const mutedLanes = readMutedLanes(value.mutedLanes, errors, `${path} mutedLanes`);

  if (!id || label === null || bars === null || !mutedLanes) {
    return null;
  }

  const normalizedLabel = label.trim();

  return {
    id,
    label: normalizedLabel || SECTION_LABELS[id],
    bars,
    mutedLanes,
  };
}

function readPattern(value: unknown, errors: string[], path: string): Pattern | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  const empty = () => Array.from({ length: 16 }, () => false);
  const optionalLanes = new Set<InstrumentId>(["clap", "808", "bassGuitar", "melody"]);
  const entries = INSTRUMENT_ORDER.map((instrument) => {
    const row = value[instrument];

    if (row === undefined) {
      if (optionalLanes.has(instrument)) {
        return [instrument, empty()] as const;
      }
      errors.push(`${path}.${instrument} is required.`);
      return null;
    }

    if (!Array.isArray(row) || row.length !== 16) {
      errors.push(`${path}.${instrument} must be an array of 16 booleans.`);
      return null;
    }

    if (row.some((step) => typeof step !== "boolean")) {
      errors.push(`${path}.${instrument} must contain only booleans.`);
      return null;
    }

    return [instrument, [...row]] as const;
  });

  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return Object.fromEntries(entries as Array<readonly [InstrumentId, boolean[]]>) as Pattern;
}

function readMutedLanes(
  value: unknown,
  errors: string[],
  path: string,
): InstrumentId[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return null;
  }

  const lanes: InstrumentId[] = [];
  for (const lane of value) {
    if (!isInstrumentId(lane)) {
      errors.push(`${path} contains an unknown instrument.`);
      return null;
    }
    lanes.push(lane);
  }

  if (new Set(lanes).size !== lanes.length) {
    errors.push(`${path} must not contain duplicate instruments.`);
    return null;
  }

  return orderedMutedLanes(lanes);
}

function orderedMutedLanes(lanes: InstrumentId[]): InstrumentId[] {
  const laneSet = new Set(lanes);
  return INSTRUMENT_ORDER.filter((instrument) => laneSet.has(instrument));
}

function readBeatStyleId(
  value: unknown,
  errors: string[],
  path: string,
): BeatStyleId | null {
  if (isBeatStyleId(value)) {
    return value;
  }

  errors.push(`${path} is not a known style.`);
  return null;
}

function readArrangementSectionId(
  value: unknown,
  errors: string[],
  path: string,
): ArrangementSectionId | null {
  if (isArrangementSectionId(value)) {
    return value;
  }

  errors.push(`${path} is not a known arrangement section.`);
  return null;
}

function readProducerTagTrigger(
  value: unknown,
  errors: string[],
): ProducerTagTrigger | null {
  if (value === "manual" || value === "intro" || value === "loop") {
    return value;
  }

  errors.push("Producer tag trigger must be manual, intro, or loop.");
  return null;
}

function readProducerTagSource(
  value: unknown,
  errors: string[],
): ProducerTagSource | null {
  if (value === undefined || value === "text") return "text";
  if (value === "recorded") return "recorded";

  errors.push("Producer tag source must be text or recorded.");
  return null;
}

function readString(value: unknown, errors: string[], path: string): string | null {
  if (typeof value === "string") {
    return value;
  }

  errors.push(`${path} must be a string.`);
  return null;
}

function readBoolean(value: unknown, errors: string[], path: string): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  errors.push(`${path} must be a boolean.`);
  return null;
}

function readIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  errors: string[],
  path: string,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${path} must be an integer.`);
    return null;
  }

  if (value < min || value > max) {
    errors.push(`${path} must be from ${min} to ${max}.`);
    return null;
  }

  return value;
}

function readNumberInRange(
  value: unknown,
  min: number,
  max: number,
  errors: string[],
  path: string,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
    return null;
  }

  if (value < min || value > max) {
    errors.push(`${path} must be from ${min} to ${max}.`);
    return null;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBeatStyleId(value: unknown): value is BeatStyleId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(BEAT_STYLES, value)
  );
}

function isArrangementSectionId(value: unknown): value is ArrangementSectionId {
  return (
    typeof value === "string" &&
    (ARRANGEMENT_SECTION_IDS as readonly string[]).includes(value)
  );
}

function isInstrumentId(value: unknown): value is InstrumentId {
  return (
    typeof value === "string" &&
    (INSTRUMENT_ORDER as readonly string[]).includes(value)
  );
}
