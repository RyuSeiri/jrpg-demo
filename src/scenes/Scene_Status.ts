import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameParty } from "../game/GameParty";
import { DataManager } from "../core/DataManager";
import { drawFooterHint, drawGauge, drawHeaderBar, drawPortrait, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Menu } from "./Scene_Menu";

// Scene_Status: a full character sheet, mirroring RPG Maker MV's Scene_Status.
export class Scene_Status implements Scene {
  private actorIndex = 0;

  start() {
    this.actorIndex = 0;
  }

  update() {
    if (Input.isTriggered("Escape")) {
      SceneManager.goto(() => new Scene_Menu());
      return;
    }
    const n = GameParty.members.length;
    if (Input.isTriggered("ArrowLeft")) this.actorIndex = (this.actorIndex - 1 + n) % n;
    if (Input.isTriggered("ArrowRight")) this.actorIndex = (this.actorIndex + 1) % n;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const actor = GameParty.members[this.actorIndex];
    drawHeaderBar(ctx, "Status", "Left/Right switch character");

    GameParty.members.forEach((m, i) => {
      const x = ctx.canvas.width / 2 - (GameParty.members.length * 90) / 2 + i * 90;
      drawText(ctx, m.name, x, 46, i === this.actorIndex ? Palette.accent : Palette.textDim, i === this.actorIndex ? "bold 12px sans-serif" : "12px sans-serif", "center");
    });

    drawWindow(ctx, 20, 60, ctx.canvas.width - 40, 340);
    drawPortrait(ctx, 36, 72, 64, actor.faceColor, actor.name[0]);
    drawText(ctx, `${actor.name}  (${actor.className})`, 112, 76, Palette.text, "bold 20px sans-serif");
    drawText(ctx, `Level ${actor.level}`, 112, 104, Palette.accent, "16px sans-serif");

    const expNext = actor.expToNextLevel;
    drawText(ctx, expNext > 0 ? `EXP to next level: ${expNext}` : "MAX LEVEL", 36, 128, Palette.textDim, "13px sans-serif");

    drawText(ctx, `HP ${actor.hp}/${actor.maxHp}`, 36, 172, "#f2f2f2", "14px sans-serif");
    drawGauge(ctx, 36, 190, 220, 10, actor.hp / actor.maxHp, Palette.hp);
    drawText(ctx, `MP ${actor.mp}/${actor.maxMp}`, 36, 208, "#c8b6ff", "14px sans-serif");
    drawGauge(ctx, 36, 226, 220, 10, actor.maxMp ? actor.mp / actor.maxMp : 0, Palette.mp);

    const stats: [string, number][] = [
      ["ATK", actor.atk],
      ["DEF", actor.def],
      ["MAT", actor.mat],
      ["MDF", actor.mdf],
      ["AGI", actor.agi],
    ];
    stats.forEach(([label, value], i) => {
      drawText(ctx, `${label}: ${value}`, 300, 172 + i * 22, Palette.text, "14px sans-serif");
    });

    wrapText(ctx, actor.profile, 300, 292, 260, 16);

    const weapon = DataManager.weapon(actor.weaponId);
    const armor = DataManager.armor(actor.armorId);
    drawText(ctx, `Weapon: ${weapon ? weapon.name : "(none)"}`, 36, 290, Palette.accent, "14px sans-serif");
    drawText(ctx, `Armor:  ${armor ? armor.name : "(none)"}`, 36, 312, Palette.accent, "14px sans-serif");

    drawText(ctx, "Skills:", 36, 344, Palette.textDim, "13px sans-serif");
    actor.skills().forEach((s, i) => {
      drawText(ctx, `${s.name} (MP${s.mpCost})`, 46, 364 + i * 20, Palette.text, "13px sans-serif");
    });

    drawFooterHint(ctx, "Esc to return to the menu");
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  ctx.save();
  ctx.font = "13px sans-serif";
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      drawText(ctx, line, x, cy, "#c8b6ff", "13px sans-serif");
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) drawText(ctx, line, x, cy, "#c8b6ff", "13px sans-serif");
  ctx.restore();
}