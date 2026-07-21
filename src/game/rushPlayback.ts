// src/game/rushPlayback.ts
// Audio for RenderATL Rush: the studio-quality bed + hit feedback.
//
// Replaces the old synth. Each beat plays its sample-rendered WAV bed (the same
// offline renderer as "Download WAV"), the player hears the full produced groove,
// and hits get a light confirmation stab. The scene clock is driven off the
// AudioContext so falling notes line up with the audible bed by construction.
import { renderRhythmBed, createHitSfx } from "../audio/rhythmBed";
import { loadKitFromUrls } from "../lib/loadKit.browser";
import type { DecodedKit } from "../lib/styleRender";
import type { GameTrackSpec } from "../lib/gameTracks";

export class RushPlayback {
  private ctx: AudioContext | null = null;
  private kit: DecodedKit | null = null;
  private hitSfx: AudioBuffer | null = null;
  private bed: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private t0 = 0; // ctx time at which elapsed === 0 (the bed's downbeat)

  /** Create/resume the context and load the shared kit + hit stab. Call on a user gesture. */
  async ensure(): Promise<void> {
    if (!this.ctx) this.ctx = new AudioContext();
    await this.ctx.resume();
    if (!this.kit) this.kit = await loadKitFromUrls();
    if (!this.hitSfx) this.hitSfx = createHitSfx(this.ctx);
  }

  /** Render the bed for a beat (synchronous once the kit is loaded). */
  prepareBed(spec: GameTrackSpec): void {
    if (!this.ctx || !this.kit) throw new Error("RushPlayback.ensure() must run before prepareBed()");
    this.bed = renderRhythmBed(spec, this.kit, this.ctx);
  }

  /**
   * Start the bed `leadInMs` from now, so the clock reaches 0 (elapsedMs) exactly
   * when the bed's downbeat sounds. During the lead-in elapsedMs is negative — the
   * countdown window.
   */
  start(leadInMs: number): void {
    if (!this.ctx || !this.bed) throw new Error("RushPlayback: no bed prepared");
    this.stop();
    const source = this.ctx.createBufferSource();
    source.buffer = this.bed;
    source.connect(this.ctx.destination);
    this.t0 = this.ctx.currentTime + leadInMs / 1000;
    source.start(this.t0);
    this.source = source;
  }

  /** Milliseconds since the bed's downbeat (negative during the lead-in). */
  elapsedMs(): number {
    return this.ctx ? (this.ctx.currentTime - this.t0) * 1000 : 0;
  }

  playHitSfx(): void {
    if (!this.ctx || !this.hitSfx) return;
    const node = this.ctx.createBufferSource();
    node.buffer = this.hitSfx;
    node.connect(this.ctx.destination);
    node.start();
  }

  /** Short square click for the 3-2-1 count-in (played over the lead-in). */
  countInClick(atMs: number, accent: boolean): void {
    if (!this.ctx) return;
    const when = this.t0 + atMs / 1000;
    if (when <= this.ctx.currentTime) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.09 : 0.05, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    o.connect(g).connect(this.ctx.destination);
    o.start(when);
    o.stop(when + 0.05);
  }

  stop(): void {
    if (this.source) {
      try { this.source.stop(); } catch (e) { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Suspend the context — freezes the bed AND the elapsed clock together (pause). */
  suspend(): void {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }

  destroy(): void {
    this.stop();
    if (this.ctx) { this.ctx.close().catch(() => { /* ignore */ }); this.ctx = null; }
    this.kit = null; this.hitSfx = null; this.bed = null;
  }
}
