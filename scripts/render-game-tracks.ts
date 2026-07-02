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
  mkdirSync(PROJECT_DIR, { recursive: true });

  // Load the kit only when we'll actually render WAVs. If it throws (e.g. VCSL
  // samples not extracted), the JSON-only fallback below still runs.
  const rushPresent = existsSync(resolve(RUSH_AUDIO_DIR, ".."));
  let kit: ReturnType<typeof loadKitFromDisk> | undefined;
  if (rushPresent) {
    mkdirSync(RUSH_AUDIO_DIR, { recursive: true });
    kit = loadKitFromDisk();
  } else {
    console.warn(`! Rush checkout not found at ${RUSH_AUDIO_DIR} — writing JSON only, skipping WAVs.`);
  }

  for (const spec of GAME_TRACK_SPECS) {
    const project = buildGameTrackProject(spec);
    writeFileSync(join(PROJECT_DIR, `${spec.slug}.beatlab.json`), exportProjectJson(project));

    if (rushPresent && kit) {
      const wav = renderGameTrackWav(spec, kit);
      writeFileSync(join(RUSH_AUDIO_DIR, `${spec.slug}.wav`), wav);
    }
    console.log(`✓ ${spec.slug} (${spec.styleId} @ ${spec.bpm}bpm)`);
  }
  console.log(`Wrote ${GAME_TRACK_SPECS.length} projects to game-tracks/${rushPresent ? ` and WAVs to ${RUSH_AUDIO_DIR}` : ""}.`);
}

main();
