# PR-21 - Open-licensed reference examples

**Type:** Content  
**Depends on:** PR-13, PR-15

## Context

The app has metadata-only commercial reference songs for learning, but the
workshop also needs legally reusable audio examples that can be bundled,
remixed, or used as fixture material. These examples should help demonstrate
trap, crunk, drill, R&B, pop, Afrobeats, and Amapiano ideas without copying
copyrighted recordings.

Candidate source pools:

- Freesound FAQ: https://freesound.org/help/faq/#licenses
- Freesound Loop Dataset: https://arxiv.org/abs/2008.11507
- Free Music Archive dataset: https://arxiv.org/abs/1612.01840
- OpenGameArt FAQ: https://opengameart.org/content/faq

## Scope

- Find at least one open-licensed audio example or sample-pack candidate for
  each supported style.
- Prefer CC0 or CC BY assets. Avoid CC BY-NC for bundled app assets unless the
  repo clearly marks them as research-only and noncommercial.
- Record title, creator, source URL, license, attribution text, BPM if known,
  style fit, and whether the asset can be bundled or only linked.
- Add an asset manifest or reference manifest that tests can validate.
- Document any genres where representative open assets are weak and provide a
  fallback plan using original patterns plus licensed one-shots.

## Acceptance criteria

- Every supported style has at least one reviewed open-license candidate.
- Bundled candidates include machine-readable license and attribution metadata.
- The app does not bundle assets with unclear, all-rights-reserved, NC-only, or
  no-derivatives terms.
- Tests validate required manifest fields and reject unsupported licenses.
- The workshop can explain the difference between commercial reference metadata
  and redistributable open-license examples.
