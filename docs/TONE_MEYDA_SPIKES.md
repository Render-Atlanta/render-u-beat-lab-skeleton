# Tone.js and Meyda Spikes

## Tone.js sample engine

The app now has a `tone-sample` engine behind the same `AudioEngine` contract as
the Web Audio synth engine. It can be selected from the sequencer controls.

Current behavior:

- Uses `Tone.start()` during the user-triggered ready flow.
- Uses Tone Transport for BPM, 16th-note scheduling, and swing.
- Supports sample-player voices when sample URLs are provided.
- Falls back to Tone synth/noise voices until PR-13 adds a licensed drum kit.
- Leaves `web-audio` as the default engine because it has no dependency load and
  remains the smallest baseline.

Spike finding:

Tone.js is a good fit for the next engine because it gives us a DAW-like
transport and a clean path to sample playback. It should coexist with the
current Web Audio engine until the licensed sample kit lands and browser testing
confirms the Tone version sounds better on workshop machines.

Build note:

Adding Tone.js and Meyda roughly doubles the production JavaScript bundle. Before
shipping this as the default workshop path, consider lazy-loading optional audio
engines or keeping the synthetic Web Audio engine as the initial load.

## Meyda beatbox analysis

The beatbox classifier now accepts an analysis provider. The default capture
path uses a Meyda-backed provider that extracts features from the captured
waveform summary, then falls back to the existing level-based rules whenever
Meyda cannot extract a usable window.

Current behavior:

- Extracts RMS, zero-crossing rate, and spectral centroid when possible.
- Uses Meyda-derived energy and brightness to enrich existing hit features.
- Keeps manual lane correction as the user-facing safety valve.
- Preserves all existing classifier behavior when waveform data is missing.

Spike finding:

Meyda is useful as an incremental feature provider, not a full replacement for
the classifier yet. The current mic capture stores a compact waveform summary,
so PR-14 should continue by comparing real captured clips and deciding whether
to retain more raw waveform data around onsets.
