// src/game/rushScenes.ts
// Boot (textures), Select (title + two beat cards), and Results scenes.
// Beats come from the Beat Lab styles; there is no difficulty selector and no
// unlock chain — the skeleton offers two beats, both playable.
import Phaser from "phaser";
import type { RushController } from "./rushController";

export function makeBootScene(): typeof Phaser.Scene {
  return class Boot extends Phaser.Scene {
    constructor() { super("Boot"); }
    create() {
      let g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 200, 46, 12); g.generateTexture("note", 200, 46); g.destroy();
      g = this.make.graphics({ x: 0, y: 0 }, false);
      for (let i = 8; i >= 1; i--) { g.fillStyle(0xffffff, 0.10); g.fillRoundedRect(20 - i * 2, 20 - i * 2, 200 + i * 4, 46 + i * 4, 16); }
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(20, 20, 200, 46, 12); g.generateTexture("noteGlow", 240, 86); g.destroy();
      g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16); g.generateTexture("dot", 32, 32); g.destroy();
      this.scene.start("Select");
    }
  } as unknown as typeof Phaser.Scene;
}

export function makeSelectScene(ctrl: RushController): typeof Phaser.Scene {
  return class Select extends Phaser.Scene {
    busy = false;
    constructor() { super("Select"); }
    create() {
      const W = ctrl.W;
      this.busy = false;
      this.cameras.main.setBackgroundColor(0x120e1c);
      this.cameras.main.fadeIn(300, 18, 12, 30);
      this.add.text(W / 2, 150, "★ POWERED BY BEAT LAB", { fontFamily: "JetBrains Mono", fontSize: "26px", color: "#ff5bd0" }).setOrigin(0.5).setLetterSpacing(6);
      this.add.text(W / 2, 240, "RENDERATL", { fontFamily: "Archivo Black", fontSize: "112px", color: "#f7ecd6" }).setOrigin(0.5);
      this.add.text(W / 2, 344, "RUSH", { fontFamily: "Archivo Black", fontSize: "112px", color: "#ff5bd0" }).setOrigin(0.5);
      const keys = ctrl.laneKeys.join("  ");
      this.add.text(W / 2, 440, `Tap  ${keys}  (or the pads) in time with the beat`, { fontFamily: "JetBrains Mono", fontSize: "24px", color: "#b9a7c9" }).setOrigin(0.5);
      this.add.text(W / 2, 500, "PICK A BEAT", { fontFamily: "JetBrains Mono", fontSize: "22px", color: "#8a7a9c" }).setOrigin(0.5).setLetterSpacing(4);

      const cardW = 720, cardH = 208, gap = 28, x0 = W / 2 - cardW / 2, y0 = 580;
      ctrl.beats.forEach((b, i) => {
        const cy = y0 + i * (cardH + gap);
        const card = this.add.container(x0, cy);
        const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1a1329).setOrigin(0).setStrokeStyle(2, 0x2a2140).setInteractive({ useHandCursor: true });
        card.add(bg);
        const badge = b.buildTarget ? "BUILD TARGET" : "REFERENCE BEAT";
        const badgeCol = b.buildTarget ? "#ffcf3f" : b.accentCss;
        card.add(this.add.text(28, 26, badge, { fontFamily: "JetBrains Mono", fontSize: "20px", color: badgeCol }).setLetterSpacing(3));
        const dots = "●".repeat(i + 1) + "○".repeat(2 - i);
        card.add(this.add.text(cardW - 28, 28, dots, { fontFamily: "JetBrains Mono", fontSize: "20px", color: b.accentCss }).setOrigin(1, 0));
        const icon = this.add.rectangle(28, 74, 64, 64, b.accentHex, 0.16).setOrigin(0).setStrokeStyle(2, b.accentHex);
        card.add(icon);
        card.add(this.add.text(110, 72, b.name.toUpperCase(), { fontFamily: "Archivo Black", fontSize: "40px", color: "#f7ecd6" }));
        card.add(this.add.text(112, 124, b.spec.bpm + " BPM", { fontFamily: "JetBrains Mono", fontSize: "20px", color: b.accentCss }).setLetterSpacing(2));
        const sub = b.buildTarget ? "Implement the amapiano style to complete this beat" : "A fully-built Beat Lab groove";
        card.add(this.add.text(28, cardH - 42, sub, { fontFamily: "JetBrains Mono", fontSize: "18px", color: "#8a7a9c" }));
        const prog = ctrl.progress[b.styleId];
        card.add(this.add.text(cardW - 28, cardH - 42, prog ? "★ " + prog.score.toLocaleString() : "— — —", { fontFamily: "JetBrains Mono", fontSize: "20px", color: prog ? "#ffcf3f" : "#5b4c6e" }).setOrigin(1, 0));
        bg.on("pointerover", () => { if (!this.busy) bg.setStrokeStyle(2, b.accentHex); });
        bg.on("pointerout", () => { if (!this.busy) bg.setStrokeStyle(2, 0x2a2140); });
        bg.on("pointerdown", () => this.pick(i));
      });

      this.loadTx = this.add.text(W / 2, ctrl.H - 90, "", { fontFamily: "JetBrains Mono", fontSize: "24px", color: "#b9a7c9" }).setOrigin(0.5).setDepth(20);
    }
    loadTx: any;
    async pick(i: number) {
      if (this.busy) return;
      this.busy = true;
      ctrl.selIdx = i;
      this.loadTx.setText("LOADING BEAT…");
      try {
        await ctrl.prepare();
      } catch (e) {
        this.loadTx.setColor("#f4485a").setText("AUDIO FAILED — TAP TO RETRY");
        this.busy = false;
        return;
      }
      this.cameras.main.fadeOut(220, 18, 12, 30);
      this.time.delayedCall(230, () => this.scene.start("Play"));
    }
  } as unknown as typeof Phaser.Scene;
}

export function makeResultsScene(ctrl: RushController): typeof Phaser.Scene {
  return class Results extends Phaser.Scene {
    constructor() { super("Results"); }
    create(d: any) {
      const W = ctrl.W, b = ctrl.beat;
      this.cameras.main.setBackgroundColor(0x120e1c);
      this.cameras.main.fadeIn(300, 18, 12, 30);
      this.add.text(W / 2, 150, b.name.toUpperCase(), { fontFamily: "JetBrains Mono", fontSize: "26px", color: b.accentCss }).setOrigin(0.5).setLetterSpacing(4);
      const head = d.failed ? "WIPED OUT — HEALTH HIT ZERO" : d.grade === "S" ? "FLAWLESS PERFORMANCE" : d.stars >= 2 ? "CROWD'S GOING WILD" : d.stars >= 1 ? "BEAT CLEARED" : "KEEP PRACTICING";
      this.add.text(W / 2, 196, head, { fontFamily: "JetBrains Mono", fontSize: "22px", color: "#8a7a9c" }).setOrigin(0.5).setLetterSpacing(3);

      for (let i = 0; i < 3; i++) {
        const on = i < d.stars;
        const s = this.add.text(W / 2 - 120 + i * 120, 320, "★", { fontFamily: "Archivo Black", fontSize: "96px", color: on ? "#ffcf3f" : "#2a2140" }).setOrigin(0.5).setScale(0);
        this.tweens.add({ targets: s, scale: 1, ease: "Back.Out", duration: 400, delay: 150 + i * 140 });
      }

      const gcol: string = ({ S: "#ffcf3f", A: "#29d17e", B: "#46b4f7", C: "#a56ef0", D: "#8a7a9c", F: "#f4485a" } as Record<string, string>)[d.grade] || "#f7ecd6";
      const gbox = this.add.rectangle(W / 2 - 150, 470, 150, 150, 0x120e1c).setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(gcol).color);
      if ((gbox as any).preFX) (gbox as any).preFX.addGlow(Phaser.Display.Color.HexStringToColor(gcol).color, 4);
      this.add.text(W / 2 - 150, 470, d.grade, { fontFamily: "Archivo Black", fontSize: "104px", color: gcol }).setOrigin(0.5);
      this.add.text(W / 2 + 10, 428, "FINAL SCORE", { fontFamily: "JetBrains Mono", fontSize: "20px", color: "#8a7a9c" }).setLetterSpacing(2);
      this.add.text(W / 2 + 10, 452, d.score.toLocaleString(), { fontFamily: "Archivo Black", fontSize: "72px", color: "#f7ecd6" });
      if (d.newBest) this.add.text(W / 2 + 12, 540, "★ NEW BEST", { fontFamily: "JetBrains Mono", fontSize: "22px", color: "#1a1020", backgroundColor: "#ffcf3f", padding: { x: 10, y: 5 } });

      const stats: [string, string | number, string][] = [["ACCURACY", Math.round(d.acc) + "%", "#f7ecd6"], ["MAX COMBO", d.maxCombo, "#ff5bd0"], ["PERFECT", d.perfect, "#ffcf3f"], ["MISS", d.miss, "#f4485a"]];
      const tW = 200, tgap = 16, tot = stats.length * tW + (stats.length - 1) * tgap, sx0 = W / 2 - tot / 2;
      stats.forEach((s, i) => {
        const x = sx0 + i * (tW + tgap);
        this.add.rectangle(x, 660, tW, 120, 0x1a1329).setOrigin(0).setStrokeStyle(2, 0x2a2140);
        this.add.text(x + tW / 2, 686, String(s[1]), { fontFamily: "Archivo Black", fontSize: "44px", color: s[2] }).setOrigin(0.5);
        this.add.text(x + tW / 2, 738, s[0], { fontFamily: "JetBrains Mono", fontSize: "18px", color: "#8a7a9c" }).setOrigin(0.5).setLetterSpacing(2);
      });

      const btns: [string, number, string, () => void][] = [
        ["RETRY", 0x1c1630, "#f7ecd6", () => { this.scene.start("Play"); }],
        ["BEATS", 0x1c1630, "#f7ecd6", () => this.scene.start("Select")],
      ];
      const bW = 260, bgap = 20, btot = btns.length * bW + (btns.length - 1) * bgap, bx0 = W / 2 - btot / 2;
      btns.forEach((b2, i) => {
        const x = bx0 + i * (bW + bgap) + bW / 2;
        const r = this.add.rectangle(x, 850, bW, 74, b2[1]).setStrokeStyle(2, 0x33294d).setInteractive({ useHandCursor: true });
        const t = this.add.text(x, 850, b2[0], { fontFamily: "JetBrains Mono", fontSize: "26px", color: b2[2] }).setOrigin(0.5).setLetterSpacing(2);
        r.on("pointerdown", () => { ctrl.playback.resume(); this.cameras.main.fadeOut(200, 18, 12, 30); this.time.delayedCall(210, b2[3]); });
        r.on("pointerover", () => t.setScale(1.05)); r.on("pointerout", () => t.setScale(1));
      });
    }
  } as unknown as typeof Phaser.Scene;
}
