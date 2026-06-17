import { describe, expect, it } from "vitest";
import {
  calculateAudioLevel,
  captureMicrophoneSample,
  getMicCaptureSupport,
  mapMicCaptureError,
  summarizeWaveform,
  summarizeWaveformFrames,
  type MicCaptureRuntime,
} from "./micCapture";

const FakeAudioContext = class {} as unknown as typeof AudioContext;
const FakeMediaRecorder = class {} as unknown as typeof MediaRecorder;

function createRuntime(overrides: MicCaptureRuntime = {}): MicCaptureRuntime {
  return {
    mediaDevices: {
      getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
    },
    AudioContext: FakeAudioContext,
    MediaRecorder: FakeMediaRecorder,
    ...overrides,
  };
}

describe("mic capture helpers", () => {
  it("reports unsupported browsers before requesting permission", () => {
    expect(getMicCaptureSupport(createRuntime({ mediaDevices: undefined }))).toMatchObject({
      supported: false,
      code: "unsupported",
    });

    expect(getMicCaptureSupport(createRuntime({ AudioContext: undefined }))).toMatchObject({
      supported: false,
      code: "unsupported",
    });

    expect(getMicCaptureSupport(createRuntime({ MediaRecorder: undefined }))).toMatchObject({
      supported: false,
      code: "unsupported",
    });
  });

  it("maps denied and missing-device DOM errors to stable capture codes", () => {
    expect(mapMicCaptureError({ name: "NotAllowedError" })).toMatchObject({
      code: "permission-denied",
    });
    expect(mapMicCaptureError({ name: "SecurityError" })).toMatchObject({
      code: "permission-denied",
    });
    expect(mapMicCaptureError({ name: "NotFoundError" })).toMatchObject({
      code: "no-device",
    });
    expect(mapMicCaptureError({ name: "OverconstrainedError" })).toMatchObject({
      code: "no-device",
    });
  });

  it("keeps permission-denied capture failures isolated from recorder setup", async () => {
    await expect(
      captureMicrophoneSample({
        runtime: createRuntime({
          mediaDevices: {
            getUserMedia: async () => {
              throw { name: "NotAllowedError" };
            },
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("keeps missing-device capture failures isolated from recorder setup", async () => {
    await expect(
      captureMicrophoneSample({
        runtime: createRuntime({
          mediaDevices: {
            getUserMedia: async () => {
              throw { name: "NotFoundError" };
            },
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "no-device" });
  });

  it("calculates deterministic rms and peak levels from normalized samples", () => {
    expect(calculateAudioLevel([0, 0.5, -1, 2, Number.NaN])).toEqual({
      rms: 0.67082,
      peak: 1,
    });
  });

  it("summarizes waveform peaks into fixed bins", () => {
    expect(summarizeWaveform([0, 0.25, -0.5, 1, -1, 0.1, 0.2, 0.3], 4)).toEqual([
      0.25,
      1,
      1,
      0.3,
    ]);
  });

  it("summarizes multiple meter frames without changing the bin count", () => {
    expect(
      summarizeWaveformFrames(
        [
          Float32Array.from([0, 0.4, -0.2, 0.1]),
          Float32Array.from([0.8, -1, 0.3, 0.2]),
        ],
        4,
      ),
    ).toEqual([0.4, 0.2, 1, 0.3]);
  });
});
