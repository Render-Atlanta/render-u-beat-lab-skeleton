# Per-level Soundtracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a distinct, genre-appropriate, seamlessly-looping soundtrack for each of RenderATL Rush's 6 stages using Beat Lab's offline renderer, and play them in the game with a synth fallback.

**Architecture:** A pure, Node-safe lib in Beat Lab (`src/lib/gameTracks.ts`) holds the per-stage specs and builds each track's `SequencerState` + `Arrangement` + `BeatLabProject`, and renders it to WAV bytes via the existing `renderArrangementWav`. A thin script (`scripts/render-game-tracks.ts`) does the disk IO: writes `<slug>.beatlab.json` into Beat Lab and `<slug>.wav` into the sibling Rush checkout. In Rush, `AudioBus` gains an optional `musicKey`; `BootScene` preloads per-stage WAVs (imported via Vite `?url`); each stage carries a `music` slug; scenes pass it to `AudioBus`, which uses the loaded track as the looping bed and falls back to the synth bed when absent.

**Tech Stack:** TypeScript (ESM, `tsx`, Vitest) in Beat Lab; vanilla JS + Phaser 4 + Vite + Vitest in RenderATL Rush.

## Global Constraints

- Render sample rate is fixed at **22050 Hz** (`RENDER_SAMPLE_RATE`); `renderArrangementWav` takes no sample-rate/loops arg — length is driven by the arrangement's bar count.
- `exportProjectJson` runs full validation: an arrangement **must contain all four section ids** `intro`/`main`/`variation`/`outro`, `bpm` must be an integer 60–180, `swing` 0–0.3. Build arrangements from `createDefaultArrangement()` and only mutate via the existing helpers.
- Beat Lab is ESM (`"type": "module"`, `moduleResolution: Bundler`); Node-only code must use the `.node.ts` / `.node.test.ts` suffix and pass `npm run hygiene` (module-boundary check). Lib code imported by the browser must **not** import `node:*`.
- The two repos are **separate git repos → two PRs**. Beat Lab work lands first (it produces the artifacts); Rush consumes them.
- Track slugs are the game's `scene` values: `airport`, `connector`, `badge`, `vendor`, `mainStage`, `afterparty`. The 3D Connector reuses `connector`.
- Genre map: airport→afrobeats, connector→trap, badge→rnb, vendor→bounce, mainStage→crunk, afterparty→amapiano.
- Rush commits assets under `assets/` imported via Vite `?url` (there is **no** `public/` dir). Existing `AudioBus` callers `new AudioBus(scene)` must keep byte-identical behavior.

---

# Part 1 — Beat Lab (`<beat-lab-checkout>`)

Branch: `feat/126-per-level-soundtracks` (already checked out; the design + this plan are committed on it).

### Task 1: `gameTracks.ts` — specs + builders + render (pure lib)

**Files:**
- Create: `src/lib/gameTracks.ts`
- Test: `src/lib/gameTracks.test.ts` (pure, no disk)
- Test: `src/lib/gameTracks.node.test.ts` (renders with the on-disk kit)

**Interfaces:**
- Consumes (all existing):
  - `createDefaultSequencerState(styleId: BeatStyleId): SequencerState` — `./patternState`
  - `createDefaultArrangement(): Arrangement`, `setSectionBars(a, "main", bars): Arrangement`, `createBeatLabProject({sequencer, arrangement}): BeatLabProject`, `exportProjectJson(project): string`, `importProjectJson(json): ProjectImportResult`, `type Arrangement`, `type BeatLabProject` — `./arrangement`
  - `createPlayableStyle(sequencer: SequencerState): BeatStyle` — `./sequencerDomain`
  - `renderArrangementWav({sequencer, style, kit, arrangement}): Uint8Array`, `type RenderArrangementWavInput` — `./exportBeat`
  - `type DecodedKit` — `./styleRender`; `type BeatStyleId` — `./beatStyles`
- Produces (for Task 2):
  - `interface GameTrackSpec { slug: string; styleId: BeatStyleId; bpm: number; bars: number }`
  - `const GAME_TRACK_SPECS: GameTrackSpec[]` (6 entries)
  - `buildGameTrackSequencer(spec: GameTrackSpec): SequencerState`
  - `buildGameTrackArrangement(spec: GameTrackSpec): Arrangement`
  - `buildGameTrackProject(spec: GameTrackSpec): BeatLabProject`
  - `renderGameTrackWav(spec: GameTrackSpec, kit: DecodedKit): Uint8Array`

- [ ] **Step 1: Write the failing pure test**

Create `src/lib/gameTracks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  GAME_TRACK_SPECS,
  buildGameTrackProject,
  buildGameTrackArrangement,
} from "./gameTracks";
import { importProjectJson, exportProjectJson, getArrangementBarCount } from "./arrangement";

const EXPECTED_SLUGS = ["airport", "connector", "badge", "vendor", "mainStage", "afterparty"];

describe("GAME_TRACK_SPECS", () => {
  it("covers the six stage slugs exactly once", () => {
    const slugs = GAME_TRACK_SPECS.map((s) => s.slug).sort();
    expect(slugs).toEqual([...EXPECTED_SLUGS].sort());
  });

  it("uses only valid bpm (60-180) and >=1 bars", () => {
    for (const spec of GAME_TRACK_SPECS) {
      expect(spec.bpm).toBeGreaterThanOrEqual(60);
      expect(spec.bpm).toBeLessThanOrEqual(180);
      expect(spec.bars).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps genres per the design", () => {
    const map = Object.fromEntries(GAME_TRACK_SPECS.map((s) => [s.slug, s.styleId]));
    expect(map).toMatchObject({
      airport: "afrobeats", connector: "trap", badge: "rnb",
      vendor: "bounce", mainStage: "crunk", afterparty: "amapiano",
    });
  });
});

describe("buildGameTrackProject", () => {
  it("produces a project that round-trips through export/import", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const project = buildGameTrackProject(spec);
      const result = importProjectJson(exportProjectJson(project));
      expect(result.ok, `${spec.slug}: ${(result as { errors?: string[] }).errors?.join(" ")}`).toBe(true);
    }
  });

  it("extends only the main section to spec.bars", () => {
    const spec = GAME_TRACK_SPECS.find((s) => s.slug === "airport")!;
    const arrangement = buildGameTrackArrangement(spec);
    const main = arrangement.sections.find((sec) => sec.id === "main")!;
    expect(main.bars).toBe(spec.bars);
    // all four sections still present (validator requirement)
    expect(arrangement.sections.map((s) => s.id).sort()).toEqual(["intro", "main", "outro", "variation"]);
    expect(getArrangementBarCount(arrangement)).toBe(spec.bars + 3);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/gameTracks.test.ts`
Expected: FAIL — `Cannot find module './gameTracks'`.

- [ ] **Step 3: Implement `src/lib/gameTracks.ts`**

```ts
import type { BeatStyleId } from "./beatStyles";
import {
  createDefaultArrangement,
  createBeatLabProject,
  setSectionBars,
  type Arrangement,
  type BeatLabProject,
} from "./arrangement";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import { createPlayableStyle } from "./sequencerDomain";
import { renderArrangementWav } from "./exportBeat";
import type { DecodedKit } from "./styleRender";

/** One generated game track. `slug` matches the game's stage `scene` value. */
export interface GameTrackSpec {
  slug: string;
  styleId: BeatStyleId;
  bpm: number;
  /** Bars on the `main` section; the loop is `bars + 3` (intro/variation/outro = 1). */
  bars: number;
}

export const GAME_TRACK_SPECS: GameTrackSpec[] = [
  { slug: "airport", styleId: "afrobeats", bpm: 108, bars: 4 },
  { slug: "connector", styleId: "trap", bpm: 140, bars: 4 },
  { slug: "badge", styleId: "rnb", bpm: 92, bars: 4 },
  { slug: "vendor", styleId: "bounce", bpm: 98, bars: 4 },
  { slug: "mainStage", styleId: "crunk", bpm: 80, bars: 4 },
  { slug: "afterparty", styleId: "amapiano", bpm: 112, bars: 4 },
];

export function buildGameTrackSequencer(spec: GameTrackSpec): SequencerState {
  return { ...createDefaultSequencerState(spec.styleId), bpm: spec.bpm };
}

export function buildGameTrackArrangement(spec: GameTrackSpec): Arrangement {
  // All four sections required by the project validator; extend `main` for length.
  return setSectionBars(createDefaultArrangement(), "main", spec.bars);
}

export function buildGameTrackProject(spec: GameTrackSpec): BeatLabProject {
  return createBeatLabProject({
    sequencer: buildGameTrackSequencer(spec),
    arrangement: buildGameTrackArrangement(spec),
  });
}

export function renderGameTrackWav(spec: GameTrackSpec, kit: DecodedKit): Uint8Array {
  const sequencer = buildGameTrackSequencer(spec);
  return renderArrangementWav({
    sequencer,
    style: createPlayableStyle(sequencer),
    kit,
    arrangement: buildGameTrackArrangement(spec),
  });
}
```

- [ ] **Step 4: Run the pure test to confirm it passes**

Run: `npx vitest run src/lib/gameTracks.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Write the failing render test (uses on-disk kit)**

Create `src/lib/gameTracks.node.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadKitFromDisk } from "./loadKit.node";
import { GAME_TRACK_SPECS, renderGameTrackWav } from "./gameTracks";

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

describe("renderGameTrackWav", () => {
  const kit = loadKitFromDisk();

  it("renders a non-empty, valid WAV for every spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const wav = renderGameTrackWav(spec, kit);
      expect(wav.length, spec.slug).toBeGreaterThan(44); // header + samples
      expect(readAscii(wav, 0, 4)).toBe("RIFF");
      expect(readAscii(wav, 8, 4)).toBe("WAVE");
      // sample rate at byte 24 (little-endian u32)
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
      expect(view.getUint32(24, true)).toBe(22050);
    }
  });
});
```

- [ ] **Step 6: Run it to confirm it passes** (implementation already exists)

Run: `npx vitest run src/lib/gameTracks.node.test.ts`
Expected: PASS. (If it fails with a kit-load error, the committed drum kit at `public/kit/*.wav` is missing — stop and report; do not stub the kit.)

- [ ] **Step 7: Verify module hygiene + scripts typecheck**

Run: `npm run hygiene && npm run typecheck:scripts`
Expected: both pass. (`gameTracks.ts` imports no `node:*`; the `.node.test.ts` is the only file touching disk.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/gameTracks.ts src/lib/gameTracks.test.ts src/lib/gameTracks.node.test.ts
git commit -m "feat: game-track specs + renderer lib (#126)"
```

### Task 2: `render-game-tracks.ts` — script + generate artifacts

**Files:**
- Create: `scripts/render-game-tracks.ts`
- Modify: `package.json` (add `generate:game-tracks` script)
- Modify: `scripts/README.md` (document the command + VCSL note)
- Create (generated, committed): `game-tracks/<slug>.beatlab.json` ×6
- Writes (into sibling repo working tree, committed in Part 2): `../renderatl-rush/assets/audio/<slug>.wav` ×6

**Interfaces:**
- Consumes: `GAME_TRACK_SPECS`, `buildGameTrackProject`, `renderGameTrackWav` (Task 1); `loadKitFromDisk` (`../src/lib/loadKit.node`); `exportProjectJson` (`../src/lib/arrangement`).

- [ ] **Step 1: Implement `scripts/render-game-tracks.ts`**

```ts
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadKitFromDisk } from "../src/lib/loadKit.node";
import { exportProjectJson } from "../src/lib/arrangement";
import {
  GAME_TRACK_SPECS,
  buildGameTrackProject,
  renderGameTrackWav,
} from "../src/lib/gameTracks";

// Where the editable projects live (committed in Beat Lab) and where the playable
// WAVs go (committed in RenderATL Rush). The Rush dir defaults to the sibling
// checkout and is overridable so the script still emits JSON when Rush is absent.
const PROJECT_DIR = join(process.cwd(), "game-tracks");
const RUSH_AUDIO_DIR = resolve(
  process.env.RUSH_AUDIO_DIR ??
    process.argv[2] ??
    join(process.cwd(), "..", "renderatl-rush", "assets", "audio"),
);

function main(): void {
  const kit = loadKitFromDisk();
  mkdirSync(PROJECT_DIR, { recursive: true });

  const rushPresent = existsSync(resolve(RUSH_AUDIO_DIR, ".."));
  if (rushPresent) mkdirSync(RUSH_AUDIO_DIR, { recursive: true });
  else console.warn(`! Rush checkout not found at ${RUSH_AUDIO_DIR} — writing JSON only, skipping WAVs.`);

  for (const spec of GAME_TRACK_SPECS) {
    const project = buildGameTrackProject(spec);
    writeFileSync(join(PROJECT_DIR, `${spec.slug}.beatlab.json`), exportProjectJson(project));

    if (rushPresent) {
      const wav = renderGameTrackWav(spec, kit);
      writeFileSync(join(RUSH_AUDIO_DIR, `${spec.slug}.wav`), wav);
    }
    console.log(`✓ ${spec.slug} (${spec.styleId} @ ${spec.bpm}bpm)`);
  }
  console.log(`Wrote ${GAME_TRACK_SPECS.length} projects to game-tracks/${rushPresent ? ` and WAVs to ${RUSH_AUDIO_DIR}` : ""}.`);
}

main();
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add after `"generate:style-profiles"`:

```json
"generate:game-tracks": "tsx scripts/render-game-tracks.ts",
```

- [ ] **Step 3: Document it in `scripts/README.md`**

Append a section:

```markdown
## generate:game-tracks

`npm run generate:game-tracks` renders one seamless-looping soundtrack per
RenderATL Rush stage. Writes editable projects to `game-tracks/<slug>.beatlab.json`
(committed here) and playable WAVs to `../renderatl-rush/assets/audio/<slug>.wav`
(committed in that repo). Override the WAV dir with `RUSH_AUDIO_DIR=... ` or a
first CLI arg.

For the richest melodies, extract the VCSL sampled voices first
(`scripts/extract-vcsl-*.sh` / `npm run generate:kit`); without them, melodic lanes
use the synth fallback. Drums + 808 render regardless.
```

- [ ] **Step 4: Run the generator and verify outputs**

Run: `npm run generate:game-tracks`
Expected: 6 `✓` lines. Then verify:

Run: `ls game-tracks/ && ls ../renderatl-rush/assets/audio/`
Expected: 6 `.beatlab.json` files in `game-tracks/`; 6 `.wav` files in the Rush audio dir.

- [ ] **Step 5: Sanity-check a project reopens**

Run: `npx tsx -e "import('./src/lib/arrangement.ts').then(async m => { const fs = await import('node:fs'); const r = m.importProjectJson(fs.readFileSync('game-tracks/connector.beatlab.json','utf8')); console.log(r.ok ? 'OK connector' : r.errors); })"`
Expected: `OK connector`.

- [ ] **Step 6: Run full check**

Run: `npm run check`
Expected: hygiene + scripts typecheck pass; Vitest — the new `gameTracks` tests pass. (Pre-existing `instrumentVoices` disk tests may still be red on a clean checkout; that gap is out of scope. Confirm no *new* failures come from this change by running `npx vitest run src/lib/gameTracks*` green.)

- [ ] **Step 7: Commit (Beat Lab side)**

```bash
git add scripts/render-game-tracks.ts scripts/README.md package.json game-tracks/
git commit -m "feat: render per-level game soundtracks script + projects (#126)"
```

The 6 `.wav` files now sit uncommitted in the Rush working tree — they are committed in Part 2.

---

# Part 2 — RenderATL Rush (`<rush-checkout>`)

Separate repo, separate PR. Create a branch there first:

```bash
git -C <rush-checkout> checkout -b feat/126-per-level-soundtracks
```

Tests run with `npm run test:unit` (Vitest). Do **not** rely on Playwright for these tasks.

### Task 3: `AudioBus` — optional per-stage music key with synth fallback

**Files:**
- Modify: `src/audio/AudioBus.js` (constructor, `init`, `onDecoded`, `addSound`)
- Test: `src/audio/AudioBus.musicKey.test.js`

**Interfaces:**
- Produces: `new AudioBus(scene, musicKey?)`. When `musicKey` is a truthy key present in `scene.cache.audio`, that loaded sound becomes the looping bed; otherwise the synth `"music"` bed is used. Default (`musicKey` omitted) is unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/audio/AudioBus.musicKey.test.js`. It uses a hand-rolled fake Phaser scene (mirroring the existing suite's style — inspect a sibling `*.test.js` for the exact fake shape and reuse it; the essential surface is below):

```js
import { describe, expect, it, vi } from "vitest";
import { AudioBus } from "./AudioBus.js";

function fakeScene({ cachedKeys = [] } = {}) {
  const cache = new Set(cachedKeys);
  const added = [];
  const sound = {
    mute: false,
    volume: 1,
    context: { state: "suspended" },
    decodeAudio: vi.fn(),
    setMute(v) { this.mute = v; },
    on: vi.fn(),
    off: vi.fn(),
    removeByKey: vi.fn(),
    add: vi.fn((key, cfg) => {
      const s = { key, cfg, isPlaying: false, play() { this.isPlaying = true; }, stop() { this.isPlaying = false; }, setVolume() {}, setPan() {} };
      added.push(s);
      return s;
    }),
    cache: { audio: { exists: (k) => cache.has(k) } },
  };
  return {
    added,
    scene: {
      sound,
      cache: { audio: { exists: (k) => cache.has(k) } },
      events: { once: vi.fn() },
    },
  };
}

describe("AudioBus music key", () => {
  it("uses a preloaded per-stage track as the bed when present", () => {
    const { scene } = fakeScene({ cachedKeys: ["connector"] });
    const bus = new AudioBus(scene, "connector");
    bus.init();
    // The bed is the loaded key, added with loop config, and NOT synthesized.
    expect(bus.music.key).toBe("connector");
    expect(bus.music.cfg).toMatchObject({ loop: true });
    const decoded = scene.sound.decodeAudio.mock.calls[0]?.[0] ?? [];
    expect(decoded.map((f) => f.key)).not.toContain("connector");
    expect(decoded.map((f) => f.key)).not.toContain("music"); // synth bed suppressed
  });

  it("falls back to the synth bed when the track is missing", () => {
    const { scene } = fakeScene({ cachedKeys: [] });
    const bus = new AudioBus(scene, "connector");
    bus.init();
    const decoded = scene.sound.decodeAudio.mock.calls[0][0].map((f) => f.key);
    expect(decoded).toContain("music"); // synth bed IS synthesized
    expect(() => bus.init()).not.toThrow();
  });

  it("default constructor still synthesizes the music bed", () => {
    const { scene } = fakeScene({ cachedKeys: [] });
    const bus = new AudioBus(scene);
    bus.init();
    const decoded = scene.sound.decodeAudio.mock.calls[0][0].map((f) => f.key);
    expect(decoded).toContain("music");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:unit -- src/audio/AudioBus.musicKey.test.js`
Expected: FAIL — `bus.music.key` is `"music"`, not `"connector"` (the key arg is ignored today).

- [ ] **Step 3: Implement the changes in `src/audio/AudioBus.js`**

Constructor — accept and store the key (replace the `constructor(scene) {` signature and add one line after `this.scene = scene;`):

```js
  constructor(scene, musicKey = "music") {
    this.scene = scene;
    this.musicKey = musicKey || "music";
    this.sound = scene.sound;
```

`init()` — resolve the bed and split synth vs loaded keys. Replace the body from `const cache = this.scene.cache.audio;` through the `decodeAudio` block with:

```js
    const cache = this.scene.cache.audio;

    // Resolve the music bed: a preloaded per-stage track if available, else the
    // synth "music" bed. Only synthesize the synth bed when no track is loaded.
    const trackLoaded = this.musicKey !== "music" && cache.exists(this.musicKey);
    this.bedKey = trackLoaded ? this.musicKey : "music";
    this.managedKeys = [...SFX_KEYS, "creep-growl", this.bedKey];
    const synthKeys = trackLoaded ? [...SFX_KEYS, "creep-growl"] : SOUND_KEYS;

    // Keys already in the cache (a restart, or the loaded track) can be added now.
    for (const key of this.managedKeys) {
      if (cache.exists(key)) this.addSound(key);
    }

    const undecoded = synthKeys.filter((key) => !cache.exists(key));
    if (undecoded.length) {
      this.sound.on("decoded", this.onDecoded, this);
      const files = undecoded.map((key) => ({ key, data: encodeWav(SYNTH[key]()) }));
      this.sound.decodeAudio(files);
    }
```

`onDecoded(key)` — gate on the managed set instead of `SOUND_KEYS`:

```js
  onDecoded(key) {
    if (!this.managedKeys?.includes(key)) return;
    this.addSound(key);
    if (this.started) this.startBeds();
  }
```

`addSound(key)` — treat the resolved bed as the looping music (replace `if (key === "music") {` with `if (key === this.bedKey) {`):

```js
  addSound(key) {
    this.sound.removeByKey(key);
    if (key === this.bedKey) {
      this.music = this.sound.add(key, { loop: true, volume: MUSIC_VOLUME });
      this.sounds[key] = this.music;
    } else if (key === "creep-growl") {
      this.growl = this.sound.add(key, { loop: true, volume: 0 });
      this.sounds[key] = this.growl;
    } else {
      this.sounds[key] = this.sound.add(key);
    }
    this.ready.add(key);
  }
```

(Note: `this.bedKey`/`this.managedKeys` are set in `init` before any `addSound`/`onDecoded` call, so the optional-chaining guard in `onDecoded` is only for the pre-init edge.)

- [ ] **Step 4: Run the new test to confirm it passes**

Run: `npm run test:unit -- src/audio/AudioBus.musicKey.test.js`
Expected: PASS (all three cases).

- [ ] **Step 5: Run the full unit suite (guard the existing AudioBus tests)**

Run: `npm run test:unit`
Expected: PASS — existing AudioBus tests still green (default path is byte-identical: `bedKey === "music"`, `managedKeys === SOUND_KEYS` contents).

- [ ] **Step 6: Commit**

```bash
git add src/audio/AudioBus.js src/audio/AudioBus.musicKey.test.js
git commit -m "feat: AudioBus optional per-stage music key with synth fallback (#126)"
```

### Task 4: Stage `music` fields + audio manifest + BootScene preload + scene wiring

**Files:**
- Modify: `src/sim/constants.js` (add `music` to 6 stages + `DRIVING3D_STAGE`)
- Modify: `src/assets.js` (import 6 WAVs via `?url`, export an `AUDIO` manifest)
- Modify: `src/scenes/BootScene.js` (`this.load.audio` per manifest entry)
- Modify: `src/scenes/StageScene.js:112`, `src/scenes/DrivingScene.js:75`, `src/scenes/Driving3DScene.js:53` (pass `this.stage.music`)
- Test: `src/sim/stageMusic.test.js`

**Interfaces:**
- Consumes: `STAGES`, `DRIVING3D_STAGE` (`src/sim/constants.js`); the `AUDIO` manifest from `src/assets.js`.
- Produces: each stage exposes `music: <slug>`; `AUDIO` = `[{ key, url }]` with one entry per unique slug.

- [ ] **Step 1: Write the failing test**

Create `src/sim/stageMusic.test.js`:

```js
import { describe, expect, it } from "vitest";
import { STAGES, DRIVING3D_STAGE } from "./constants.js";
import { AUDIO } from "../assets.js";

const EXPECTED = {
  "Airport Arrival": "airport",
  "Connector Sprint": "connector",
  "Badge Pickup": "badge",
  "Vendor Hall": "vendor",
  "Main Stage": "mainStage",
  "Afterparty Sprint": "afterparty",
};

describe("stage music", () => {
  it("assigns the designed slug to every stage", () => {
    for (const stage of STAGES) {
      expect(stage.music, stage.name).toBe(EXPECTED[stage.name]);
    }
  });

  it("reuses the connector track for the 3D stage", () => {
    expect(DRIVING3D_STAGE.music).toBe("connector");
  });

  it("has a manifest entry for every stage slug", () => {
    const keys = new Set(AUDIO.map((a) => a.key));
    for (const stage of STAGES) expect(keys.has(stage.music), stage.music).toBe(true);
    expect(keys.has(DRIVING3D_STAGE.music)).toBe(true);
  });

  it("manifest keys are unique (connector shared, not duplicated)", () => {
    const keys = AUDIO.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:unit -- src/sim/stageMusic.test.js`
Expected: FAIL — `AUDIO` is not exported / `stage.music` is undefined.

- [ ] **Step 3: Add the audio manifest to `src/assets.js`**

Near the other `?url` imports, add:

```js
import airportMusicUrl from "../assets/audio/airport.wav?url";
import connectorMusicUrl from "../assets/audio/connector.wav?url";
import badgeMusicUrl from "../assets/audio/badge.wav?url";
import vendorMusicUrl from "../assets/audio/vendor.wav?url";
import mainStageMusicUrl from "../assets/audio/mainStage.wav?url";
import afterpartyMusicUrl from "../assets/audio/afterparty.wav?url";
```

Then export the manifest (place near the top-level exported manifests):

```js
// Per-stage soundtracks (#126). Keys are stage `scene` slugs; BootScene loads
// each via this.load.audio. The 3D Connector reuses the "connector" track.
export const AUDIO = [
  { key: "airport", url: airportMusicUrl },
  { key: "connector", url: connectorMusicUrl },
  { key: "badge", url: badgeMusicUrl },
  { key: "vendor", url: vendorMusicUrl },
  { key: "mainStage", url: mainStageMusicUrl },
  { key: "afterparty", url: afterpartyMusicUrl },
];
```

- [ ] **Step 4: Preload the manifest in `src/scenes/BootScene.js`**

Add the import at the top: `import { AUDIO } from "../assets.js";` (extend the existing `preloadAssets` import line or add a new one). In `preload()`, after `preloadAssets(this);`:

```js
    for (const { key, url } of AUDIO) this.load.audio(key, url);
```

- [ ] **Step 5: Add `music` to the stages in `src/sim/constants.js`**

For each stage object add a `music` field next to `scene`. Exact edits (add the line after the `scene:` line of each):
- Airport (`scene: "airport"`) → `music: "airport",`
- Connector (`scene: "connector"`) → `music: "connector",`
- Badge (`scene: "badge"`) → `music: "badge",`
- Vendor (`scene: "vendor"`) → `music: "vendor",`
- Main Stage (`scene: "mainStage"`) → `music: "mainStage",`
- Afterparty (`scene: "afterparty"`) → `music: "afterparty",`
- `DRIVING3D_STAGE` (`scene: "connector3d"`) → `music: "connector",`

- [ ] **Step 6: Pass the slug in the three scenes**

- `src/scenes/StageScene.js:112`: `this.audio = new AudioBus(this);` → `this.audio = new AudioBus(this, this.stage?.music);`
- `src/scenes/DrivingScene.js:75`: same replacement.
- `src/scenes/Driving3DScene.js:53`: same replacement.

- [ ] **Step 7: Run the test to confirm it passes**

Run: `npm run test:unit -- src/sim/stageMusic.test.js`
Expected: PASS. (The `?url` imports resolve under Vitest+Vite; the `.wav` files exist from Part 1 Step 4.)

- [ ] **Step 8: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 9: Commit (code + the generated WAVs together)**

```bash
git add src/sim/constants.js src/assets.js src/scenes/BootScene.js \
        src/scenes/StageScene.js src/scenes/DrivingScene.js src/scenes/Driving3DScene.js \
        src/sim/stageMusic.test.js assets/audio/
git commit -m "feat: play per-stage generated soundtracks (#126)"
```

### Task 5: End-to-end verification in the game

**Files:** none (verification only).

- [ ] **Step 1: Build to confirm assets bundle**

Run: `npm run build`
Expected: build succeeds; `bundle/` contains the 6 WAVs under the `build/` assets dir (Vite copies `?url` imports).

- [ ] **Step 2: Drive one stage and confirm audio wiring**

Run: `npm run dev`, open the app, start a stage, and gesture (arrow/tap) to unlock audio. Confirm the stage's loop plays and the global Music mute still silences it. (If a headless check is preferred, extend the existing Playwright audio smoke to assert `window.pinklineStageTest.sound().musicPlaying === true` after a gesture and `keys` includes the stage slug.)
Expected: stage-specific loop audible; mute toggles it; no console errors.

- [ ] **Step 3: (No commit)** Report verification results. Part 2 branch is ready to open as a PR.

---

## Post-implementation

- Open the Beat Lab PR (Part 1) first; once merged, open the Rush PR (Part 2). Reference #126 in both. CodeRabbit/Codex review Ready PRs; local `npm run check` (Beat Lab) and `npm run test:unit` + `npm run build` (Rush) are the gates.
- The pre-existing Beat Lab `instrumentVoices` disk-test failure is **not** addressed here; call it out in the PR description so a red `npm run check` isn't mistaken for a regression from this change.
