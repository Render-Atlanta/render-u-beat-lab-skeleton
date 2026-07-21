// src/game/rushPlayScene.ts
// The Play scene: falling notes over the studio bed, pads, HUD, judging, health.
// Notes are the folded Beat Lab chart (timeMs); audio is the sample-rendered bed
// (ctrl.playback). Hits give particle/popup feedback + a light confirmation stab —
// the groove itself always plays from the bed (play-along model).
import Phaser from "phaser";
import type { RushController } from "./rushController";

export function makePlayScene(ctrl: RushController): typeof Phaser.Scene {
  return class Play extends Phaser.Scene {
    approach = 0; PERFECT = 0; GOOD = 0;
    score = 0; combo = 0; maxCombo = 0; hp = 100;
    counts = { perfect: 0, good: 0, miss: 0 };
    laneFlash: number[] = [];
    done = false; running = true; paused = false;
    bg: any; beatG: any; noteLayer: any; fxG: any; hitLine: any;
    targets: any[] = []; emitters: any[] = []; pads: any[] = [];
    comboTx: any; accTx: any; scoreTx: any; hpBar: any; popup: any; countTx: any; readyTx: any;
    pauseUI: any = null; _lastCount: string | null = null;

    constructor() { super("Play"); }

    create() {
      const W = ctrl.W, H = ctrl.H, HITY = ctrl.HITY;
      this.cameras.main.setBackgroundColor(0x120e1c);
      this.cameras.main.fadeIn(250, 18, 12, 30);
      const laneW = W / ctrl.laneCount;
      this.approach = ctrl.approachMs; this.PERFECT = ctrl.perfectMs; this.GOOD = ctrl.goodMs;
      this.score = 0; this.combo = 0; this.maxCombo = 0; this.hp = 100;
      this.counts = { perfect: 0, good: 0, miss: 0 };
      this.laneFlash = new Array(ctrl.laneCount).fill(0);
      this.done = false; this.running = true; this.paused = false;
      const b = ctrl.beat;

      this.bg = this.add.graphics();
      this.beatG = this.add.graphics();
      this.noteLayer = this.add.container(0, 0);
      this.fxG = this.add.graphics();

      this.hitLine = this.add.rectangle(W / 2, HITY, W, 6, 0xff5bd0).setDepth(5);
      if (this.hitLine.preFX) this.hitLine.preFX.addGlow(0xff5bd0, 6);
      this.targets = [];
      for (let i = 0; i < ctrl.laneCount; i++) {
        const cx = i * laneW + laneW / 2;
        const r = this.add.rectangle(cx, HITY, laneW * 0.62, 34, 0x000000, 0).setStrokeStyle(3, ctrl.laneHex[i]).setFillStyle(ctrl.laneHex[i], 0.06).setDepth(4);
        if (r.preFX) r.preFX.addGlow(ctrl.laneHex[i], 3);
        this.targets.push(r);
      }

      this.emitters = [];
      for (let i = 0; i < ctrl.laneCount; i++) {
        const em = this.add.particles(0, 0, "dot", { speed: { min: 120, max: 420 }, angle: { min: 200, max: 340 }, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 520, blendMode: "ADD", tint: ctrl.laneHex[i], emitting: false });
        em.setDepth(8);
        this.emitters.push(em);
      }

      this.add.rectangle(0, 0, W, 118, 0x160f24).setOrigin(0).setDepth(10);
      this.add.line(0, 0, 0, 118, W, 118, 0x2a2140).setOrigin(0).setLineWidth(1).setDepth(10);
      this.add.text(30, 30, b.name.toUpperCase(), { fontFamily: "Archivo Black", fontSize: "34px", color: "#f7ecd6" }).setDepth(11);
      this.add.text(32, 74, b.spec.bpm + " BPM · " + (b.buildTarget ? "BUILD TARGET" : "REFERENCE"), { fontFamily: "JetBrains Mono", fontSize: "20px", color: b.accentCss }).setDepth(11).setLetterSpacing(2);
      const mk = (x: number, lab: string) => {
        this.add.text(x, 26, lab, { fontFamily: "JetBrains Mono", fontSize: "18px", color: "#8a7a9c" }).setOrigin(0.5, 0).setDepth(11).setLetterSpacing(2);
        return this.add.text(x, 50, "0", { fontFamily: "Archivo Black", fontSize: "40px", color: "#f7ecd6" }).setOrigin(0.5, 0).setDepth(11);
      };
      this.comboTx = mk(W - 470, "COMBO");
      this.accTx = mk(W - 320, "ACC");
      this.scoreTx = mk(W - 150, "SCORE");
      this.add.rectangle(0, 118, W, 8, 0x241a2e).setOrigin(0).setDepth(10);
      this.hpBar = this.add.rectangle(0, 118, W, 8, 0x29d17e).setOrigin(0).setDepth(11);

      this.pads = [];
      const padY = H - 130, padH = 150, padGap = 14;
      const padW = (W - padGap * (ctrl.laneCount + 1)) / ctrl.laneCount;
      for (let i = 0; i < ctrl.laneCount; i++) {
        const px = padGap + i * (padW + padGap) + padW / 2;
        const pad = this.add.rectangle(px, padY, padW, padH, ctrl.laneHex[i], 0.16).setStrokeStyle(3, ctrl.laneHex[i]).setInteractive({ useHandCursor: true });
        this.add.text(px, padY - 18, ctrl.laneKeys[i], { fontFamily: "Archivo Black", fontSize: "40px", color: ctrl.laneCss[i] }).setOrigin(0.5);
        this.add.text(px, padY + 30, ctrl.laneTags[i], { fontFamily: "JetBrains Mono", fontSize: "18px", color: ctrl.laneCss[i] }).setOrigin(0.5).setAlpha(0.7).setLetterSpacing(2);
        pad.on("pointerdown", () => this.hit(i));
        this.pads.push(pad);
      }

      this.popup = this.add.text(W / 2, H * 0.42, "", { fontFamily: "Archivo Black", fontSize: "76px", color: "#ffcf3f" }).setOrigin(0.5).setDepth(12).setAlpha(0);
      this.countTx = this.add.text(W / 2, H * 0.42, "3", { fontFamily: "Archivo Black", fontSize: "180px", color: "#ff5bd0" }).setOrigin(0.5).setDepth(13);
      this.readyTx = this.add.text(W / 2, H * 0.42 + 130, "GET READY TO PERFORM", { fontFamily: "JetBrains Mono", fontSize: "24px", color: "#b9a7c9" }).setOrigin(0.5).setDepth(13).setLetterSpacing(4);
      this._lastCount = null;

      const pb = this.add.text(W - 40, 150, "❚❚", { fontFamily: "JetBrains Mono", fontSize: "28px", color: "#b9a7c9" }).setOrigin(1, 0).setDepth(11).setInteractive({ useHandCursor: true });
      pb.on("pointerdown", () => this.togglePause());

      ctrl.startBeat();
      this.events.once("shutdown", () => { ctrl.stopBeat(); });
    }

    togglePause() {
      if (this.done) return;
      const W = ctrl.W, H = ctrl.H;
      if (this.paused) {
        this.paused = false; this.running = true;
        ctrl.playback.resume(); // context resumes; the frozen audio clock continues
        if (this.pauseUI) { this.pauseUI.destroy(); this.pauseUI = null; }
      } else {
        this.paused = true; this.running = false;
        ctrl.playback.suspend(); // freezes bed + the elapsed clock together
        this.pauseUI = this.add.container(0, 0).setDepth(20);
        this.pauseUI.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0e0a17, 0.86));
        this.pauseUI.add(this.add.text(W / 2, H / 2 - 60, "PAUSED", { fontFamily: "Archivo Black", fontSize: "72px", color: "#f7ecd6" }).setOrigin(0.5));
        const mkBtn = (dx: number, label: string, cb: () => void) => {
          const bb = this.add.rectangle(W / 2 + dx, H / 2 + 40, 200, 66, 0x1c1630).setStrokeStyle(2, 0x33294d).setInteractive({ useHandCursor: true });
          const t = this.add.text(W / 2 + dx, H / 2 + 40, label, { fontFamily: "JetBrains Mono", fontSize: "24px", color: "#f7ecd6" }).setOrigin(0.5);
          bb.on("pointerdown", cb); this.pauseUI.add(bb); this.pauseUI.add(t);
        };
        mkBtn(-160, "RESUME", () => this.togglePause());
        mkBtn(160, "BEATS", () => { ctrl.stopBeat(); ctrl.playback.resume(); this.scene.start("Select"); });
      }
    }

    hit(lane: number) {
      if (!this.running || this.done) return;
      const el = ctrl.el();
      let best: any = null, bd = 1e9;
      for (const n of ctrl.notes) { if (n.lane !== lane || n.judged) continue; const d = Math.abs(n.timeMs - el); if (d < bd) { bd = d; best = n; } }
      this.laneFlash[lane] = performance.now();
      this.tweens.add({ targets: this.pads[lane], scaleX: 1.08, scaleY: 1.08, duration: 70, yoyo: true });
      if (best && bd <= this.GOOD) { ctrl.playback.playHitSfx(); this.judge(best, bd, lane); }
    }
    judge(note: any, d: number, lane: number) {
      const kind = d <= this.PERFECT ? "perfect" : "good";
      note.judged = kind; (this.counts as any)[kind]++;
      this.combo++; if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const mult = this.combo >= 32 ? 4 : this.combo >= 16 ? 3 : this.combo >= 8 ? 2 : 1;
      this.score += (kind === "perfect" ? 100 : 50) * mult;
      this.hp = Math.min(100, this.hp + (kind === "perfect" ? ctrl.regenP : ctrl.regenG));
      const cx = lane * (ctrl.W / ctrl.laneCount) + (ctrl.W / ctrl.laneCount) / 2;
      this.emitters[lane].explode(kind === "perfect" ? 20 : 10, cx, ctrl.HITY);
      if (kind === "perfect" && this.combo % 8 === 0) this.cameras.main.flash(160, 60, 20, 55);
      this.showPopup(kind);
    }
    showPopup(kind: string) {
      const map: Record<string, [string, string]> = { perfect: ["PERFECT", "#ffcf3f"], good: ["GOOD", "#29d17e"], miss: ["MISS", "#f4485a"] };
      const m = map[kind];
      this.popup.setText(m[0]).setColor(m[1]).setAlpha(1).setScale(1.3);
      this.tweens.killTweensOf(this.popup);
      this.tweens.add({ targets: this.popup, scale: 1, duration: 140 });
      this.tweens.add({ targets: this.popup, alpha: 0, delay: 320, duration: 220 });
    }

    update() {
      if (!this.running) return;
      const el = ctrl.el();
      let ctxt: string | null = null;
      if (el < 0) ctxt = String(Math.max(1, Math.min(3, Math.ceil(-el / 1000))));
      else if (el < 550) ctxt = "GO";
      if (ctxt !== this._lastCount) {
        this._lastCount = ctxt;
        if (ctxt == null) { this.countTx.setVisible(false); this.readyTx.setVisible(false); }
        else { this.countTx.setText(ctxt).setVisible(true).setScale(1.5).setAlpha(1); this.readyTx.setVisible(true); this.tweens.add({ targets: this.countTx, scale: 0.8, alpha: 0.3, duration: 750 }); }
      }
      let missed = false;
      for (const n of ctrl.notes) { if (n.judged) continue; if (el > n.timeMs + this.GOOD) { n.judged = "miss"; this.counts.miss++; this.combo = 0; this.hp -= ctrl.missHp; missed = true; } }
      if (missed) { this.showPopup("miss"); this.cameras.main.shake(180, 0.006); }
      this.drawBoard(el);
      const total = this.counts.perfect + this.counts.good + this.counts.miss;
      const acc = total ? (this.counts.perfect + this.counts.good * 0.5) / total * 100 : 100;
      const mult = this.combo >= 32 ? 4 : this.combo >= 16 ? 3 : this.combo >= 8 ? 2 : 1;
      this.comboTx.setText(this.combo + (mult > 1 ? "×" + mult : "")).setColor(this.combo >= 8 ? "#ffcf3f" : "#f7ecd6");
      this.accTx.setText(Math.round(acc) + "%");
      this.scoreTx.setText(this.score.toLocaleString());
      const hpc = this.hp > 50 ? 0x29d17e : this.hp > 25 ? 0xffc61f : 0xf4485a;
      this.hpBar.setFillStyle(hpc); this.hpBar.width = ctrl.W * Math.max(0, this.hp) / 100;
      if (this.hp <= 0) return this.finish(true);
      if (el > ctrl.lastNoteMs + ctrl.TAIL) return this.finish(false);
    }

    drawBoard(el: number) {
      const W = ctrl.W, HITY = ctrl.HITY, laneW = W / ctrl.laneCount, bd = 60000 / ctrl.chartBpm;
      this.bg.clear(); this.beatG.clear(); this.fxG.clear();
      for (let i = 0; i < ctrl.laneCount; i++) {
        this.bg.fillStyle(ctrl.laneHex[i], 0.05); this.bg.fillRect(i * laneW, 124, laneW, HITY - 124);
        this.bg.lineStyle(1, 0x2a2140, 0.8); this.bg.beginPath(); this.bg.moveTo(i * laneW, 124); this.bg.lineTo(i * laneW, ctrl.H); this.bg.strokePath();
      }
      const firstBeat = Math.floor((el - this.approach) / bd) - 1;
      for (let k = firstBeat; k < firstBeat + 16; k++) {
        const rem = k * bd - el; if (rem > this.approach || rem < -bd) continue;
        const y = HITY * (1 - rem / this.approach); if (y < 124 || y > HITY) continue;
        this.beatG.lineStyle(1, 0x3a2f55, k % 4 === 0 ? 0.6 : 0.25); this.beatG.beginPath(); this.beatG.moveTo(0, y); this.beatG.lineTo(W, y); this.beatG.strokePath();
      }
      const phase = ((el % bd) + bd) % bd / bd; const pulse = el >= 0 ? 1 - phase : 0.3;
      this.hitLine.setAlpha(0.55 + 0.45 * pulse);
      for (let i = 0; i < ctrl.laneCount; i++) {
        const f = Math.max(0, 1 - (performance.now() - this.laneFlash[i]) / 170);
        this.targets[i].setFillStyle(ctrl.laneHex[i], 0.06 + 0.3 * f);
        if (f > 0) { this.fxG.fillStyle(ctrl.laneHex[i], 0.22 * f); this.fxG.fillRect(i * laneW, HITY - 260, laneW, 260); }
      }
      this.noteLayer.removeAll(true);
      for (const n of ctrl.notes) {
        if (n.judged) continue;
        const rem = n.timeMs - el; if (rem > this.approach || rem < -160) continue;
        const y = HITY * (1 - rem / this.approach); const cx = n.lane * laneW + laneW / 2;
        const glow = this.add.image(cx, y, "noteGlow").setTint(ctrl.laneHex[n.lane]).setAlpha(0.5).setDisplaySize(laneW * 0.78, 62);
        const body = this.add.image(cx, y, "note").setTint(ctrl.laneHex[n.lane]).setDisplaySize(laneW * 0.6, 40);
        this.noteLayer.add(glow); this.noteLayer.add(body);
      }
    }

    finish(failed: boolean) {
      if (this.done) return; this.done = true; this.running = false;
      ctrl.stopBeat();
      const total = this.counts.perfect + this.counts.good + this.counts.miss;
      const acc = total ? (this.counts.perfect + this.counts.good * 0.5) / total * 100 : 0;
      const stars = failed ? 0 : acc >= 92 ? 3 : acc >= 78 ? 2 : acc >= 55 ? 1 : 0;
      const grade = failed ? "F" : acc >= 95 ? "S" : acc >= 88 ? "A" : acc >= 78 ? "B" : acc >= 68 ? "C" : "D";
      const styleId = ctrl.beat.styleId;
      const prev = ctrl.progress[styleId] || { score: 0, stars: 0 };
      const newBest = !failed && this.score > (prev.score || 0);
      if (!failed) { ctrl.progress[styleId] = { score: Math.max(prev.score || 0, this.score), stars: Math.max(prev.stars || 0, stars), grade }; ctrl.saveProgress(); }
      this.cameras.main.fadeOut(260, 18, 12, 30);
      this.time.delayedCall(270, () => this.scene.start("Results", { score: this.score, acc, stars, grade, failed, newBest, maxCombo: this.maxCombo, perfect: this.counts.perfect, good: this.counts.good, miss: this.counts.miss }));
    }
  } as unknown as typeof Phaser.Scene;
}
