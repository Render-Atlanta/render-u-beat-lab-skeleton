# Render U Beat Lab Spec

## One-liner

Turn a room full of non-producers into beat makers by letting them start from
genre templates, learn the role of each drum sound, then capture table taps or
beatboxing into a clean browser-made loop.

## Workshop alignment

The product is a teaching vehicle for reusable AI workflows:

- The app has unfamiliar APIs: Web Audio, microphone permissions, timing.
- It has messy real-world constraints: noisy rooms, browser autoplay rules,
  HTTPS-only mic access, mobile layouts.
- It benefits from repeatable standards: design system, test strategy,
  acceptance criteria, deployment path.

Students leave with a reusable workflow and a working demo.

## Target user

Primary: workshop attendees who are software builders, not musicians.

Secondary: the instructor, who wants beat-making guidance embedded in the app so
the demo teaches music concepts while teaching engineering process.

## Core principles

1. Playable before clever.
2. Deterministic before AI-assisted.
3. Teach the beat as you build it.
4. Keep the microphone path optional until the base sequencer is solid.
5. Every prototype must be testable.

## Functional scope

### P0: Skeleton beat machine

- RenderATL-flavored UI.
- Style presets: Trap, Crunk, Drill, R&B, Pop.
- Synthesized kick/snare/hat/open-hat using Web Audio.
- Producer tag button using browser speech synthesis as a placeholder.
- Pattern helper tests.

### P1: Editable sequencer

- Toggle cells in a 16-step grid.
- BPM and swing controls.
- Save/load pattern from URL state.
- Beat coach explains what changed.

### P2: Table tap capture

- Request mic permission.
- Record 4 seconds of input.
- Detect onset peaks from amplitude envelope.
- Quantize hits to a 16-step grid.
- Preview raw hits vs cleaned pattern.

### P3: Beatbox capture

- Classify hits into likely drum lanes:
  - low energy / low centroid: kick
  - noisy mid transient: snare/clap
  - high centroid: hat
- Allow manual correction.
- Keep fallback mode if classification confidence is low.

### P4: Producer polish

- Record or type a producer tag.
- Apply simple effects: pitch, delay, filter.
- Arrange 4-bar intro/main/outro.
- Export WAV or shareable project JSON.

## Non-goals for the workshop version

- Full DAW.
- Perfect genre authenticity.
- Copyrighted samples.
- Server-side model training.
- Multi-track vocal recording.

## Deployment

Deploy as a static Vite build on Vercel. Mic capture requires HTTPS in browsers;
Vercel serves every deployment over HTTPS automatically, making the hosted demo
viable without extra certificate work.
