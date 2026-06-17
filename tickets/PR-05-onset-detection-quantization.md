# PR-05 - Onset detection + quantization

**Type:** Feature  
**Depends on:** PR-04

## Scope

- Convert captured audio into an amplitude envelope.
- Detect transient peaks with a configurable threshold.
- Quantize detected hit times to 16 steps.
- Show raw hits and cleaned grid.
- Add a sensitivity control.

## Acceptance criteria

- Table taps produce a recognizable one-lane rhythm.
- Quiet background noise does not create constant false hits.
- Tests cover peak picking and quantization with fixture arrays.
