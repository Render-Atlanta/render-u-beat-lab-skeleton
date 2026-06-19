import {
  readSequencerStateFromParams,
  writeSequencerStateToParams,
  type SequencerState,
} from "./patternState";

export const AUTOSAVE_STORAGE_KEY = "rubl-beat-v1";
export const BEAT_SHARE_PARAM = "beat";

const LEGACY_BEAT_PARAMS = [
  "style",
  "bpm",
  "swing",
  "pattern",
  "vol",
  "vel",
  "bass",
  "melody",
];

export function serializeBeat(state: SequencerState): string {
  return writeSequencerStateToParams(state).toString();
}

export function deserializeBeat(value: string): SequencerState | null {
  if (value.trim() === "") {
    return null;
  }

  const params = new URLSearchParams(value);
  if (
    !params.has("style") ||
    !params.has("bpm") ||
    !params.has("swing") ||
    !params.has("pattern")
  ) {
    return null;
  }

  return readSequencerStateFromParams(params);
}

export function encodeBeatParam(state: SequencerState): string {
  return toBase64Url(serializeBeat(state));
}

export function decodeBeatParam(value: string): SequencerState | null {
  try {
    return deserializeBeat(fromBase64Url(value));
  } catch {
    return null;
  }
}

export function readSharedSequencerState(params: URLSearchParams): SequencerState {
  const sharedBeat = params.get(BEAT_SHARE_PARAM);
  if (sharedBeat) {
    const decoded = decodeBeatParam(sharedBeat);
    if (decoded) {
      return decoded;
    }
  }

  return readSequencerStateFromParams(params);
}

export function readAutosavedSequencerState(storage: Storage | null): SequencerState | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(AUTOSAVE_STORAGE_KEY);
    return value ? deserializeBeat(value) : null;
  } catch {
    return null;
  }
}

export function writeAutosavedSequencerState(
  storage: Storage | null,
  state: SequencerState,
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTOSAVE_STORAGE_KEY, serializeBeat(state));
  } catch {
    // Ignore storage write failures (private mode/quota/etc).
  }
}

export function readInitialSequencerStateFromSources(
  params: URLSearchParams,
  storage: Storage | null,
): SequencerState {
  const sharedBeat = params.get(BEAT_SHARE_PARAM);
  if (sharedBeat) {
    const decoded = decodeBeatParam(sharedBeat);
    if (decoded) {
      return decoded;
    }
  }

  if (hasLegacyBeatParams(params)) {
    return readSharedSequencerState(params);
  }

  return readAutosavedSequencerState(storage) ?? readSharedSequencerState(params);
}

export function createShareUrl(state: SequencerState, location: Location): string {
  const params = new URLSearchParams();
  params.set(BEAT_SHARE_PARAM, encodeBeatParam(state));
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function hasLegacyBeatParams(params: URLSearchParams): boolean {
  return LEGACY_BEAT_PARAMS.some((key) => params.has(key));
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
