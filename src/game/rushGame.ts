// src/game/rushGame.ts
// Mounts RenderATL Rush (Phaser) into a host element and returns a teardown fn.
// Beats + audio are derived from the Beat Lab styles via RushController; this file
// only wires Phaser and the document-level keyboard (Phaser's per-scene key events
// are loop-tick dependent, so input lives here).
import Phaser from "phaser";
import { RushController } from "./rushController";
import { makeBootScene, makeSelectScene, makeResultsScene } from "./rushScenes";
import { makePlayScene } from "./rushPlayScene";

export interface RushOptions {
  onExit?: () => void;
}

/** Boot the game into `host`. Returns a cleanup function that tears everything down. */
export function createRushGame(host: HTMLElement, _opts: RushOptions = {}): () => void {
  const ctrl = new RushController();

  let game: Phaser.Game | null = null;
  let destroyed = false;

  const playScene = (): any => {
    if (!game) return null;
    const pl: any = game.scene.getScene("Play");
    return pl && pl.scene.isActive() ? pl : null;
  };

  const onVis = () => {
    const pl = playScene();
    if (document.hidden && pl && pl.running && !pl.done && !pl.paused) pl.togglePause();
  };
  const onKey = (e: KeyboardEvent) => {
    const pl = playScene();
    if (!pl) return;
    if (e.code === "KeyP" || e.code === "Escape") { e.preventDefault(); pl.togglePause(); return; }
    const idx = ctrl.laneKeys.indexOf((e.key || "").toUpperCase());
    if (idx >= 0 && !e.repeat) { e.preventDefault(); pl.hit(idx); }
  };
  document.addEventListener("visibilitychange", onVis);
  document.addEventListener("keydown", onKey);

  const boot = () => {
    if (destroyed) return;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: ctrl.W,
      height: ctrl.H,
      backgroundColor: "#120e1c",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      fps: { target: 60, forceSetTimeOut: true },
      audio: { noAudio: true }, // audio is our own Web Audio bed, not Phaser's
      banner: false,
      scene: [makeBootScene(), makeSelectScene(ctrl), makePlayScene(ctrl), makeResultsScene(ctrl)],
    });
  };

  // Wait for the display fonts so the arcade type renders correctly on first paint.
  if (document.fonts && (document.fonts as any).load) {
    Promise.all([
      (document.fonts as any).load('400 40px "Archivo Black"'),
      (document.fonts as any).load('700 20px "JetBrains Mono"'),
    ]).then(boot).catch(boot);
  } else {
    boot();
  }

  return () => {
    destroyed = true;
    document.removeEventListener("visibilitychange", onVis);
    document.removeEventListener("keydown", onKey);
    ctrl.stopBeat();
    ctrl.playback.destroy();
    if (game) { try { game.destroy(true); } catch (e) { /* ignore */ } game = null; }
  };
}
