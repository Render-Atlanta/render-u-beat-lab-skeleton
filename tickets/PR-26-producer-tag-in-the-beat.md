# PR-26 - Producer tag in the beat

**Type:** Feature
**Depends on:** PR-22, PR-25, PR-08
**Wave:** 2 (producer tag)

## Context

Users want the tag to be *part of the beat*, not just a one-off button press.
Today the tag fires manually or once at "intro" and (for TTS) plays outside the
audio graph, so it cannot be mixed or exported. Once the tag is a real audio
buffer routed through master (PR-25) and the engine emits step events (PR-22),
the tag can be scheduled into the loop and included in export.

## Scope

- Let the user place the tag in the loop: choose a trigger such as intro only,
  every N bars/loops, or a specific step; store this in tag config.
- Schedule the tag in the engine so it fires at the chosen position in sync with
  the transport (reuse the PR-22 step/transport timing).
- Mix the tag through the master gain alongside the drums (recorded clip path;
  TTS stays best-effort manual since it cannot be sampled into the mix).
- Include the tag in the project export: serialize tag placement in the project
  JSON, and render the tag into the WAV export when a recorded clip exists.
- Provide a clear "tag in loop on/off" affordance so it does not surprise users.

## Acceptance criteria

- With placement enabled, the tag plays automatically at the chosen point while
  the loop runs, in time with the beat.
- A recorded tag is audible in the rendered WAV export; placement is captured in
  the exported project JSON.
- Turning placement off returns the tag to manual-only behavior.
- Behavior is covered by deterministic tests on the scheduling/placement logic.
