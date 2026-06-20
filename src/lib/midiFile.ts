/**
 * Minimal Standard MIDI File (SMF) writer/reader. Hand-rolled rather than
 * pulling in a dependency: the format is frozen and small, and it mirrors how
 * `wav.ts` encodes/decodes its own bytes deterministically. Only the subset the
 * beat exporter needs is implemented — Format 1, tempo/time-signature/name meta
 * events, program changes, and note on/off.
 */

export interface MidiNoteEvent {
  /** MIDI channel, 0-15 (channel 9 is the General MIDI percussion channel). */
  channel: number;
  /** Note number, 0-127. */
  note: number;
  /** Velocity, 1-127. */
  velocity: number;
  startTick: number;
  durationTicks: number;
}

export interface MidiTrackSpec {
  name?: string;
  /** Optional GM program change emitted at tick 0 on the given channel. */
  program?: { channel: number; program: number };
  notes: MidiNoteEvent[];
}

export interface EncodeMidiOptions {
  bpm: number;
  /** Pulses (ticks) per quarter note. Default 480. */
  ppq?: number;
}

export const DEFAULT_PPQ = 480;

/** Status/meta byte constants, shared with the reader (`midiReader.ts`). */
export const META = 0xff;
export const META_TRACK_NAME = 0x03;
export const META_END_OF_TRACK = 0x2f;
export const META_SET_TEMPO = 0x51;
const META_TIME_SIGNATURE = 0x58;
const NOTE_OFF = 0x80;
export const NOTE_ON = 0x90;
export const PROGRAM_CHANGE = 0xc0;

interface RawEvent {
  tick: number;
  /** Tie-break for events sharing a tick: meta/off before on, so a note-off
   * never silences a fresh note-on of the same pitch landing on the same tick. */
  order: number;
  bytes: number[];
}

/** Encode a Format-1 MIDI file: a conductor track plus one track per spec. */
export function encodeMidiFile(
  tracks: MidiTrackSpec[],
  options: EncodeMidiOptions,
): Uint8Array {
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const chunks = [
    buildHeaderChunk(tracks.length + 1, ppq),
    buildConductorChunk(options.bpm),
    ...tracks.map(buildTrackChunk),
  ];
  return concatBytes(chunks);
}

function buildHeaderChunk(trackCount: number, ppq: number): Uint8Array {
  const data: number[] = [];
  pushUint16(data, 1); // format 1
  pushUint16(data, trackCount);
  pushUint16(data, ppq);
  return wrapChunk("MThd", data);
}

function buildConductorChunk(bpm: number): Uint8Array {
  const microsPerQuarter = Math.round(60_000_000 / bpm);
  const events: RawEvent[] = [
    metaEvent(0, META_TRACK_NAME, strBytes("Render U Beat")),
    metaEvent(0, META_TIME_SIGNATURE, [0x04, 0x02, 0x18, 0x08]), // 4/4
    metaEvent(0, META_SET_TEMPO, [
      (microsPerQuarter >> 16) & 0xff,
      (microsPerQuarter >> 8) & 0xff,
      microsPerQuarter & 0xff,
    ]),
  ];
  return wrapChunk("MTrk", eventsToData(events));
}

function buildTrackChunk(spec: MidiTrackSpec): Uint8Array {
  const events: RawEvent[] = [];
  if (spec.name) {
    events.push(metaEvent(0, META_TRACK_NAME, strBytes(spec.name)));
  }
  if (spec.program) {
    events.push({
      tick: 0,
      order: 0,
      bytes: [PROGRAM_CHANGE | (spec.program.channel & 0x0f), spec.program.program & 0x7f],
    });
  }
  for (const note of spec.notes) {
    const ch = note.channel & 0x0f;
    events.push({
      tick: note.startTick,
      order: 2,
      bytes: [NOTE_ON | ch, note.note & 0x7f, clampVelocity(note.velocity)],
    });
    events.push({
      tick: note.startTick + Math.max(1, note.durationTicks),
      order: 1,
      bytes: [NOTE_OFF | ch, note.note & 0x7f, 0],
    });
  }
  return wrapChunk("MTrk", eventsToData(events));
}

function metaEvent(tick: number, type: number, payload: number[]): RawEvent {
  return { tick, order: 0, bytes: [META, type, ...toVarLen(payload.length), ...payload] };
}

function eventsToData(events: RawEvent[]): number[] {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const data: number[] = [];
  let prevTick = 0;
  for (const event of events) {
    for (const byte of toVarLen(event.tick - prevTick)) data.push(byte);
    for (const byte of event.bytes) data.push(byte);
    prevTick = event.tick;
  }
  data.push(0x00, META, META_END_OF_TRACK, 0x00); // end of track
  return data;
}

function clampVelocity(velocity: number): number {
  return Math.max(1, Math.min(127, Math.round(velocity)));
}

/** Variable-length quantity: 7 bits per byte, MSB set on all but the last. */
function toVarLen(value: number): number[] {
  if (value < 0 || !Number.isFinite(value)) {
    throw new Error(`Cannot encode negative/invalid delta time: ${value}`);
  }
  let remaining = Math.floor(value);
  const out = [remaining & 0x7f];
  remaining = Math.floor(remaining / 128);
  while (remaining > 0) {
    out.unshift((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  return out;
}

function wrapChunk(id: string, data: number[]): Uint8Array {
  const bytes: number[] = [];
  pushStr(bytes, id);
  pushUint32(bytes, data.length);
  for (const byte of data) bytes.push(byte);
  return Uint8Array.from(bytes);
}

function pushStr(bytes: number[], value: string): void {
  for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i) & 0xff);
}

function strBytes(value: string): number[] {
  const bytes: number[] = [];
  pushStr(bytes, value);
  return bytes;
}

function pushUint16(bytes: number[], value: number): void {
  bytes.push((value >> 8) & 0xff, value & 0xff);
}

function pushUint32(bytes: number[], value: number): void {
  bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
