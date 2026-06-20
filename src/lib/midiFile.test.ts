import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ, encodeMidiFile, type MidiTrackSpec } from "./midiFile";
import { decodeMidiFile } from "./midiReader";

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) s += String.fromCharCode(bytes[start + i]);
  return s;
}

describe("midiFile", () => {
  it("writes a Format-1 header with a conductor track plus one track per spec", () => {
    const bytes = encodeMidiFile([{ name: "Drums", notes: [] }], { bpm: 120 });

    expect(ascii(bytes, 0, 4)).toBe("MThd");
    // header length 6, then format=1, ntracks=2 (conductor + Drums), division=480
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(4, false)).toBe(6);
    expect(view.getUint16(8, false)).toBe(1);
    expect(view.getUint16(10, false)).toBe(2);
    expect(view.getUint16(12, false)).toBe(DEFAULT_PPQ);
    expect(ascii(bytes, 14, 4)).toBe("MTrk");
  });

  it("round-trips tempo and notes through decode", () => {
    const tracks: MidiTrackSpec[] = [
      {
        name: "Drums",
        notes: [
          { channel: 9, note: 36, velocity: 100, startTick: 0, durationTicks: 60 },
          { channel: 9, note: 38, velocity: 127, startTick: 240, durationTicks: 60 },
        ],
      },
      {
        name: "808",
        program: { channel: 0, program: 38 },
        notes: [{ channel: 0, note: 48, velocity: 80, startTick: 0, durationTicks: 432 }],
      },
    ];

    const decoded = decodeMidiFile(encodeMidiFile(tracks, { bpm: 140 }));

    expect(decoded.format).toBe(1);
    expect(decoded.ppq).toBe(DEFAULT_PPQ);
    expect(decoded.tempoBpm).toBe(140);
    // conductor track carries no notes/name worth surfacing → only content tracks
    expect(decoded.tracks.map((t) => t.name)).toEqual(["Drums", "808"]);

    const drums = decoded.tracks[0];
    expect(drums.noteOns).toEqual([
      { channel: 9, note: 36, velocity: 100, tick: 0 },
      { channel: 9, note: 38, velocity: 127, tick: 240 },
    ]);
    expect(decoded.tracks[1].noteOns).toEqual([
      { channel: 0, note: 48, velocity: 80, tick: 0 },
    ]);
  });

  it("encodes multi-byte delta times (variable-length quantity) correctly", () => {
    // A note starting at tick 1000 forces a 2-byte VLQ delta; decoding must
    // recover the exact tick.
    const decoded = decodeMidiFile(
      encodeMidiFile(
        [{ notes: [{ channel: 0, note: 60, velocity: 64, startTick: 1000, durationTicks: 100 }] }],
        { bpm: 120 },
      ),
    );
    expect(decoded.tracks[0].noteOns[0].tick).toBe(1000);
  });

  it("decodes channel events that use running status (omitted repeat status byte)", () => {
    // Hand-built file: track 1 fires two note-ons but only states the 0x90
    // status once; the second note and the vel-0 note-off rely on running
    // status. A reader without running-status support desyncs here.
    const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
    const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
    const chunk = (id: string, data: number[]) => [
      ...id.split("").map((c) => c.charCodeAt(0)),
      ...u32(data.length),
      ...data,
    ];
    const conductor = [0x00, 0xff, 0x2f, 0x00]; // just end-of-track
    const content = [
      0x00, 0x90, 0x3c, 0x40, // t0: note-on ch0 note60 vel64 (sets running status)
      0x78, 0x3e, 0x40, //       t120: running-status note-on note62 vel64
      0x00, 0x3c, 0x00, //       running-status note-on note60 vel0 (= note-off)
      0x00, 0xff, 0x2f, 0x00, // end-of-track (clears running status)
    ];
    const file = Uint8Array.from([
      ...chunk("MThd", [...u16(1), ...u16(2), ...u16(480)]),
      ...chunk("MTrk", conductor),
      ...chunk("MTrk", content),
    ]);

    const decoded = decodeMidiFile(file);
    expect(decoded.tracks).toHaveLength(1);
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 0, note: 60, velocity: 64, tick: 0 },
      { channel: 0, note: 62, velocity: 64, tick: 120 },
    ]);
  });

  it("skips SysEx events and keeps parsing the notes around them", () => {
    const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
    const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
    const chunk = (id: string, data: number[]) => [
      ...id.split("").map((c) => c.charCodeAt(0)),
      ...u32(data.length),
      ...data,
    ];
    const conductor = [0x00, 0xff, 0x2f, 0x00];
    const content = [
      0x00, 0xf0, 0x03, 0x7d, 0x01, 0xf7, // t0: SysEx, length 3, then 3 bytes — skipped
      0x00, 0x90, 0x40, 0x50, //            t0: note-on note64 vel80
      0x00, 0xff, 0x2f, 0x00,
    ];
    const file = Uint8Array.from([
      ...chunk("MThd", [...u16(1), ...u16(2), ...u16(480)]),
      ...chunk("MTrk", conductor),
      ...chunk("MTrk", content),
    ]);

    const decoded = decodeMidiFile(file);
    expect(decoded.tracks[0].noteOns).toEqual([
      { channel: 0, note: 64, velocity: 80, tick: 0 },
    ]);
  });

  it("rejects a data byte with no running status in effect", () => {
    const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
    const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
    const chunk = (id: string, data: number[]) => [
      ...id.split("").map((c) => c.charCodeAt(0)),
      ...u32(data.length),
      ...data,
    ];
    const conductor = [0x00, 0xff, 0x2f, 0x00];
    // First event is a bare data byte (0x3c) with no prior status → malformed.
    const content = [0x00, 0x3c, 0x40, 0x00, 0xff, 0x2f, 0x00];
    const file = Uint8Array.from([
      ...chunk("MThd", [...u16(1), ...u16(2), ...u16(480)]),
      ...chunk("MTrk", conductor),
      ...chunk("MTrk", content),
    ]);

    expect(() => decodeMidiFile(file)).toThrow(/running status/);
  });

  it("clamps velocity into the valid 1..127 MIDI range", () => {
    const decoded = decodeMidiFile(
      encodeMidiFile(
        [{ notes: [{ channel: 0, note: 60, velocity: 999, startTick: 0, durationTicks: 50 }] }],
        { bpm: 120 },
      ),
    );
    expect(decoded.tracks[0].noteOns[0].velocity).toBe(127);
  });
});
