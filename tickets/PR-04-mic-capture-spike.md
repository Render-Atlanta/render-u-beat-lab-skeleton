# PR-04 - Microphone capture spike

**Type:** Spike  
**Depends on:** PR-01

## Scope

- Add a gated microphone permission flow.
- Capture 4 seconds of audio from `navigator.mediaDevices.getUserMedia`.
- Draw a simple waveform or level meter.
- Store captured samples in memory only.
- Provide clear failure states for denied permission and missing devices.

## Acceptance criteria

- Works on localhost and HTTPS.
- Denied mic permission does not break the rest of the app.
- No audio is uploaded to a server.
- Spike notes document browser quirks and next implementation choice.
