# Open-licensed reference examples

The app keeps **two distinct kinds** of reference material. Knowing the
difference is the whole point of this doc — the workshop should be able to
explain it on the spot.

## Two manifests, two purposes

| | Commercial reference metadata | Redistributable open-license examples |
| --- | --- | --- |
| Module | [`src/lib/styleReferences.ts`](../src/lib/styleReferences.ts) (`STYLE_REFERENCES`) | [`src/lib/openReferences.ts`](../src/lib/openReferences.ts) (`OPEN_REFERENCES`) |
| What it is | Pointers to **commercial recordings** (artist, title, BPM, feel, swing, link) | Actual **assets we may legally reuse** |
| Why it exists | To teach the *feel* and tempo of a style by ear | To bundle, remix, or use as fixtures |
| Can we ship the audio? | **No** — metadata only, all-rights-reserved | **Yes** — only when the license allows it |
| Example | "Future — Mask Off, 150 BPM, half-time feel" | The in-repo original pattern + CC0 kit |

`STYLE_REFERENCES` never contains audio we are allowed to redistribute — it is a
study list. `OPEN_REFERENCES` is the opposite: everything in it is either CC0/
CC-BY/CC-BY-SA we may bundle, or a clearly marked link-only research pointer.

## License policy

Bundleable assets MUST carry one of the **allowed** licenses:

- `CC0` — public domain dedication
- `CC-BY` — attribution required
- `CC-BY-SA` — attribution + share-alike

The app **must not** bundle anything with **disallowed** terms. These may only
be recorded as link-only research pointers (`bundleable: false`):

- `CC-BY-NC`, `CC-BY-NC-SA`, `CC-BY-NC-ND` (noncommercial)
- `CC-BY-ND`, `CC-BY-NC-ND` (no-derivatives)
- `ARR` (all rights reserved)
- `unclear` (terms not confirmed)

`validateOpenReferences()` enforces this: any `bundleable: true` entry whose
license is outside the allowed set produces an issue, as does any bundleable
entry that is not `verified: true`. Tests in
[`openReferences.test.ts`](../src/lib/openReferences.test.ts) prove every
disallowed license is rejected.

## CC0 dedication

Every `bundleable` CC0 entry in `OPEN_REFERENCES` is the repo's own original
beat pattern rendered with the bundled drum kit. **Both halves** of that asset
are dedicated to the public domain under
[Creative Commons Zero 1.0 (CC0)](https://creativecommons.org/publicdomain/zero/1.0/)
by Render U Beat Lab:

- the original beat patterns in [`src/lib/beatStyles.ts`](../src/lib/beatStyles.ts), and
- the drum one-shots in [`public/kit/`](../public/kit/LICENSE.md).

You may copy, modify, remix, and redistribute them for any purpose, with no
attribution required. This grant is what lets those entries be `bundleable: true`
with `license: "CC0"`. ([`public/kit/LICENSE.md`](../public/kit/LICENSE.md)
covers only the samples, so the pattern data needed this explicit dedication
too.) The grant does **not** extend to the commercial recordings in
`STYLE_REFERENCES`, which remain metadata-only and non-redistributable.

## What we actually ship today

For **every** supported style (trap, crunk, drill, R&B, pop, Afrobeats,
amapiano) the guaranteed bundleable example is a real asset we own: the repo's
**own original beat pattern** ([`src/lib/beatStyles.ts`](../src/lib/beatStyles.ts))
played with the **in-repo CC0 drum kit** ([`src/audio/sampleKit.ts`](../src/audio/sampleKit.ts),
licensed in [`public/kit/LICENSE.md`](../public/kit/LICENSE.md)). It is CC0,
ours to redistribute, and needs no external attribution.

**No external tracks are bundled, and none were fabricated.** We deliberately do
not list invented creators, URLs, BPMs, or license terms — fabricated
attribution is a real-world harm.

## Vetted external candidates (link-only, awaiting human confirmation)

Alongside each style's in-repo CC0 original, `OPEN_REFERENCES` now carries
**researched external candidates**. Each was found in a source pool below, its
license read **directly from the asset's own page** (URLs in the table), and is
stored as `bundleable: false` + `verified: false` — a link-only pointer for a
human to confirm the license and download before any bundling. All verified
candidates below are Free Music Archive tracks under **CC BY 4.0**.

| Style | Candidate | Creator | License | Source page (license verified here) |
| --- | --- | --- | --- | --- |
| trap | Achilles | 1000 Handz | CC BY 4.0 | <https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/achilles-1/> |
| crunk | *(none found)* | — | — | No verified CC0/CC-BY crunk-specific candidate located; keeps only its in-repo CC0 original. |
| drill | Fugitive (73 BPM) | JMHBM (Beat Mekanik) | CC BY 4.0 | <https://freemusicarchive.org/music/beat-mekanik/single/fugitive/> |
| drill | Runnin' (145 BPM) | JMHBM (Beat Mekanik) | CC BY 4.0 | <https://freemusicarchive.org/music/beat-mekanik/single/runnin/> |
| rnb | Soul Sync | Ketsa | CC BY 4.0 | <https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/soul-sync/> |
| pop | Upbeat Corporate Pop | Music for Creators | CC BY 4.0 | <https://freemusicarchive.org/music/fretbound/corporate-background-music-1/upbeat-corporate-pop/> |
| afrobeats | Sun Still Sky | Ketsa | CC BY 4.0 | <https://freemusicarchive.org/music/Ketsa/upbeat-street/sun-still-sky/> |
| amapiano | Amapiano | Elijah_K | CC BY 4.0 | <https://freemusicarchive.org/music/elijah-k/single/amapiano/> |

These are CC BY (an allowed bundle license) but remain **link-only** until a
human verifies and downloads them; only then should `verified`/`bundleable`
flip. CC BY requires attribution — each row ships a ready-to-paste
`attributionText`.

## Candidate source pools (research pointers)

Real pools a human can mine for genuinely open CC0/CC-BY assets:

- Free Music Archive (per-track CC license shown on the page): <https://freemusicarchive.org>
- Freesound license FAQ: <https://freesound.org/help/faq/#licenses>
- Freesound Loop Dataset: <https://arxiv.org/abs/2008.11507>
- Free Music Archive dataset: <https://arxiv.org/abs/1612.01840>
- OpenGameArt FAQ: <https://opengameart.org/content/faq>

## Adding an external open pick (human workflow)

1. Find a candidate in a pool above (or elsewhere) that fits a style.
2. **Confirm the license** on the asset's own page — not a search snippet.
   Confirm it is CC0, CC-BY, or CC-BY-SA if you want to bundle it.
3. **Capture attribution**: exact creator name, title, source URL, and the
   ready-to-paste `attributionText` the license requires.
4. Add a row to `OPEN_REFERENCES[styleId]` with the real fields.
5. **Decide bundle vs link**:
   - Allowed license + you have the asset → `bundleable: true`.
   - Disallowed/unclear license, or link-only → `bundleable: false`.
6. Set `verified: true` only after a human has done steps 2–3. A `bundleable:
   true` entry that is still `verified: false` fails validation by design.
7. Run `npm test` — `validateOpenReferences()` must stay green.

If you cannot verify a candidate, **omit it**. Do not add a placeholder row.

## Weak-coverage genres and the fallback plan

Open, representative assets are thin for some styles. In particular, **crunk**
has no dedicated CC0/CC-BY instrumental that genuinely captures the groove —
research across Free Music Archive, Freesound, and OpenGameArt turned up no
honest crunk-specific match, so crunk deliberately keeps **only its in-repo CC0
original** rather than a forced or fabricated pointer. Drill, Afrobeats, and
amapiano were thin too, but real CC BY candidates were found and recorded as
link-only pointers above. Rather than ship questionable or fabricated
attribution, the **fallback is what we already do for every style**:

- the **original in-repo pattern** for that style (`BEAT_STYLES[styleId]`), plus
- the **CC0 one-shots from PR-13** (`public/kit/*.wav`).

This guarantees at least one legally-clean, redistributable example per style
today, with room for a human to add vetted external picks over time.
