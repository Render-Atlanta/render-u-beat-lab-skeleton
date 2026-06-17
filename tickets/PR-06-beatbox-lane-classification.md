# PR-06 - Beatbox lane classification

**Type:** Feature  
**Depends on:** PR-05

## Scope

- Extract simple features for each detected hit.
- Map hits to kick/snare/hat lanes by energy and spectral brightness.
- Show confidence or "needs correction" state.
- Let users manually move hits between lanes.

## Acceptance criteria

- Low beatbox hits generally map to kick.
- Sharp/noisy hits generally map to snare or hat.
- User can fix every classification mistake.
- Tests cover classifier rules with synthetic feature fixtures.
