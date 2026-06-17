# Microphone Capture Spike Notes

## Current helper shape

- `captureMicrophoneSample()` requests `getUserMedia({ audio })`, records for 4 seconds by default, and stops all stream tracks afterward.
- Audio chunks stay in memory as `Blob` chunks plus a combined `Blob`; nothing is persisted or uploaded.
- The Web Audio meter produces deterministic `levels` frames and a fixed-bin `waveform` summary for UI rendering.
- Browser APIs are injected through `MicCaptureRuntime`, so tests can use fakes without opening a real microphone.

## Browser quirks

- Microphone capture requires `localhost` or HTTPS. Render's managed HTTPS works for hosted demos.
- Permission denial appears as `NotAllowedError`, `SecurityError`, or older `PermissionDeniedError` depending on browser.
- Missing or unmatched devices appear as `NotFoundError`, `DevicesNotFoundError`, or `OverconstrainedError`.
- A busy or unreadable microphone can throw `NotReadableError` or `AbortError`; the helper maps these to `capture-failed`.
- `MediaRecorder` support is required for this spike's in-memory audio chunks. If a future target lacks it, the next fallback would be an `AudioWorklet`/Web Audio buffer path.

## Next implementation choice

Use the helper as the low-level capture boundary, then build a React panel or hook that owns UI state:

1. `idle`: show gated capture button.
2. `requesting`: call `captureMicrophoneSample()`.
3. `recording`: render `levels`/`waveform` as they arrive once streaming UI is needed.
4. `captured`: keep the returned `Blob`, `levels`, and `waveform` in component state only.
5. `error`: map `unsupported`, `permission-denied`, `no-device`, and `capture-failed` to clear copy.

For PR-05 onset detection, prefer feeding `waveform`/meter frames into the quantization path first, then add fuller audio decoding only if the simple amplitude envelope is too noisy in the workshop room.
