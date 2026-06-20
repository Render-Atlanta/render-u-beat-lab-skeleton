/**
 * Reader for the subset of Standard MIDI Files that `midiFile.ts` writes.
 * Round-trips with `encodeMidiFile` and is used by tests (and available to any
 * future MIDI-import feature). Surfaces tempo plus each content track's notes.
 */
import {
  META,
  META_END_OF_TRACK,
  META_SET_TEMPO,
  META_TRACK_NAME,
  NOTE_ON,
  PROGRAM_CHANGE,
} from "./midiFile";

export interface DecodedMidiNote {
  channel: number;
  note: number;
  velocity: number;
  tick: number;
}

export interface DecodedMidiTrack {
  name?: string;
  noteOns: DecodedMidiNote[];
}

export interface DecodedMidi {
  format: number;
  ppq: number;
  tempoBpm?: number;
  tracks: DecodedMidiTrack[];
}

export function decodeMidiFile(input: ArrayBufferView | ArrayBuffer): DecodedMidi {
  const view = toDataView(input);
  if (readStr(view, 0, 4) !== "MThd") {
    throw new Error("Input is not a MIDI file (missing MThd header)");
  }
  const format = view.getUint16(8, false);
  const trackCount = view.getUint16(10, false);
  const ppq = view.getUint16(12, false);

  let offset = 8 + view.getUint32(4, false);
  const tracks: DecodedMidiTrack[] = [];
  let tempoBpm: number | undefined;

  for (let t = 0; t < trackCount; t += 1) {
    if (readStr(view, offset, 4) !== "MTrk") {
      throw new Error(`Expected MTrk chunk at byte ${offset}`);
    }
    const length = view.getUint32(offset + 4, false);
    const body = offset + 8;
    const parsed = parseTrack(view, body, body + length);
    if (parsed.tempoBpm !== undefined) tempoBpm = parsed.tempoBpm;
    // In a Format-1 file the first track is the conductor (tempo/meta only);
    // surface its tempo but keep it out of the content-track list.
    if (t > 0 && (parsed.name || parsed.noteOns.length > 0)) {
      tracks.push({ name: parsed.name, noteOns: parsed.noteOns });
    }
    offset = body + length;
  }

  return { format, ppq, tempoBpm, tracks };
}

function parseTrack(
  view: DataView,
  start: number,
  end: number,
): { name?: string; tempoBpm?: number; noteOns: DecodedMidiNote[] } {
  let pos = start;
  let tick = 0;
  let name: string | undefined;
  let tempoBpm: number | undefined;
  let runningStatus = 0;
  const noteOns: DecodedMidiNote[] = [];

  while (pos < end) {
    const delta = readVarLen(view, pos);
    tick += delta.value;
    pos = delta.next;

    // Running status: a data byte (high bit clear) where a status byte is
    // expected means "reuse the previous channel-voice status". Channel-voice
    // events set it; meta/sysex events (0xF0+) clear it.
    let status = view.getUint8(pos);
    if ((status & 0x80) !== 0) {
      pos += 1;
      // Channel-voice messages (0x80-0xEF) set running status; meta/sysex clear it.
      runningStatus = status < 0xf0 ? status : 0;
    } else {
      if (runningStatus === 0) {
        throw new Error(`MIDI data byte with no running status at byte ${pos}`);
      }
      status = runningStatus;
    }

    if (status === META) {
      const type = view.getUint8(pos);
      pos += 1;
      const len = readVarLen(view, pos);
      const dataStart = len.next;
      pos = dataStart + len.value;
      if (type === META_TRACK_NAME) name = readStr(view, dataStart, len.value);
      else if (type === META_SET_TEMPO) {
        const micros =
          (view.getUint8(dataStart) << 16) |
          (view.getUint8(dataStart + 1) << 8) |
          view.getUint8(dataStart + 2);
        tempoBpm = Math.round(60_000_000 / micros);
      } else if (type === META_END_OF_TRACK) break;
    } else if (status === 0xf0 || status === 0xf7) {
      // SysEx event: a VLQ length followed by that many data bytes. Skip it.
      const len = readVarLen(view, pos);
      pos = len.next + len.value;
    } else {
      const high = status & 0xf0;
      const channel = status & 0x0f;
      const dataBytes = high === PROGRAM_CHANGE || high === 0xd0 ? 1 : 2;
      if (high === NOTE_ON) {
        const note = view.getUint8(pos);
        const velocity = view.getUint8(pos + 1);
        if (velocity > 0) noteOns.push({ channel, note, velocity, tick });
      }
      pos += dataBytes;
    }
  }

  return { name, tempoBpm, noteOns };
}

function readVarLen(view: DataView, offset: number): { value: number; next: number } {
  let value = 0;
  let pos = offset;
  for (;;) {
    const byte = view.getUint8(pos);
    pos += 1;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: pos };
}

function toDataView(input: ArrayBufferView | ArrayBuffer): DataView {
  if (input instanceof ArrayBuffer) return new DataView(input);
  return new DataView(input.buffer, input.byteOffset, input.byteLength);
}

function readStr(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
