export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  durationMs: number;
}

export function decodeWav(input: ArrayBufferView | ArrayBuffer): DecodedAudio {
  const buffer =
    input instanceof ArrayBuffer
      ? input
      : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const view = new DataView(buffer);

  if (buffer.byteLength < 12 || readStr(view, 0, 4) !== "RIFF" || readStr(view, 8, 4) !== "WAVE") {
    throw new Error("Input is not a WAV file (missing RIFF/WAVE header)");
  }

  let offset = 12;
  let format = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readStr(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === "fmt ") {
      format = view.getUint16(body, true);
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (dataOffset < 0 || numChannels === 0 || sampleRate === 0 || bitsPerSample === 0) {
    throw new Error("WAV file missing fmt or data chunk");
  }

  // Only PCM integer (1) and IEEE float (3) are supported. Other format tags
  // (compressed/extensible variants) must fail fast rather than be misread as PCM.
  if (format !== 1 && format !== 3) {
    throw new Error(`Unsupported WAV format tag: ${format} (only PCM 1 and IEEE float 3 are supported)`);
  }

  // The header's reported data size cannot be trusted on malformed files; clamp
  // it to the bytes actually present so we never over-allocate or read past the buffer.
  const availableDataBytes = Math.max(0, buffer.byteLength - dataOffset);
  const safeDataLength = Math.min(dataLength, availableDataBytes);

  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(safeDataLength / (bytesPerSample * numChannels));
  const samples = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch += 1) {
      const pos = dataOffset + (frame * numChannels + ch) * bytesPerSample;
      sum += readSample(view, pos, bitsPerSample, format);
    }
    samples[frame] = sum / numChannels;
  }

  return { samples, sampleRate, durationMs: (frameCount / sampleRate) * 1000 };
}

function readSample(view: DataView, pos: number, bits: number, format: number): number {
  if (format === 3) return view.getFloat32(pos, true);
  if (bits === 16) return view.getInt16(pos, true) / 32768;
  if (bits === 32) return view.getInt32(pos, true) / 2147483648;
  if (bits === 24) {
    const b0 = view.getUint8(pos);
    const b1 = view.getUint8(pos + 1);
    const b2 = view.getUint8(pos + 2);
    let v = b0 | (b1 << 8) | (b2 << 16);
    if (v & 0x800000) v -= 0x1000000; // sign-extend
    return v / 8388608;
  }
  throw new Error(`Unsupported WAV sample format: ${bits}-bit, format ${format}`);
}

function readStr(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
