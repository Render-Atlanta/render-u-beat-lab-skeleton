# PR-14 - Meyda beatbox analysis spike

**Type:** Spike  
**Depends on:** PR-06

## Context

The current beatbox classifier uses hand-written audio features. Meyda can
extract common audio descriptors in JavaScript, which may improve kick, snare,
and hat classification while keeping the app browser-deployable.

References:

- Meyda docs: https://meyda.js.org/
- Meyda GitHub: https://github.com/meyda/meyda

## Scope

- Add a `BeatboxAnalysisProvider` interface for frame-level feature extraction.
- Implement a Meyda-backed provider for spectral centroid, RMS/energy, and
  other useful descriptors.
- Compare Meyda features against the existing classifier fixtures.
- Keep the existing classifier available as a fallback.

## Acceptance criteria

- The spike records whether Meyda improves classification confidence for
  synthetic fixtures and at least a few recorded test clips.
- Tests cover provider normalization using deterministic fixture data.
- The UI still allows manual correction when classification confidence is low.
- The app remains deployable as a browser-only Render static site.
