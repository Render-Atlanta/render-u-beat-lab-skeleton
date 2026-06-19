# PR-25 - Producer tag: set and record your voice

**Type:** Feature
**Depends on:** PR-04, PR-07
**Wave:** 2 (producer tag)

## Context

The current producer tag is text-to-speech only and the text input is buried in
the coach panel, far from the hero "Producer tag" button — so users report they
"can't set or record a tag." SPEC P4 explicitly calls for "record or type a
producer tag." Microphone capture already exists (`micCapture.ts`,
`captureMicrophoneSample`) and can be reused to record the user's own voice.

This ticket covers *set* and *record*. Scheduling the tag into the loop and
exporting it is PR-26.

## Scope

- Make the producer tag input and the button feel like one control: the button
  plays whatever is currently set; the input is adjacent and obvious.
- Add a "Record tag" path that captures a short voice clip via the existing mic
  infrastructure and stores it as a decoded audio buffer in app state.
- Let the user choose the active tag source: typed (text-to-speech) or recorded
  clip; allow re-record and clear.
- Play a recorded clip through the audio graph (master gain), not via
  `speechSynthesis`, so it is audible alongside the beat and reusable by PR-26.
- Keep the text-to-speech fallback when mic is unavailable or no clip is
  recorded; preserve existing rate/pitch controls for the TTS path.

## Acceptance criteria

- User can type a tag OR record their voice and hear either on demand.
- Recording reuses mic-permission handling and degrades gracefully when denied.
- A recorded clip routes through the master output (mixable / exportable later).
- Tag source, recorded state, and clear/re-record are reflected in the UI.
- App stays usable when speech synthesis and/or microphone are unavailable.
