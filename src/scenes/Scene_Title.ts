import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameParty } from "../game/GameParty";
import { GameMap } from "../game/GameMap";
import { SaveManager } from "../game/SaveManager";
import { DataManager } from "../core/DataManager";
import { drawBackdrop, drawFooterHint, drawStarfield, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Prologue } from "./Scene_Prologue";
import { Scene_Map } from "./Scene_Map";

const COMMANDS = ["New Game", "Continue"];

// Scene_Title: mirrors RPG Maker MV's Scene_Title command window.
export class Scene_Title implements Scene {
  private index = 0;
  private time = 0;

  start() {
    this.index = 0;
    this.time = 0;
  }

  update(dt: number) {
    this.time += dt;
    if (Input.isTriggered("ArrowUp")) {
      this.index = (this.index - 1 + COMMANDS.length) % COMMANDS.length;
    }
    if (Input.isTriggered("ArrowDown")) {
      this.index = (this.index + 1) % COMMANDS.length;
    }
    if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
      if (this.index === 0) {
        GameParty.setupInitialParty([1, 2, 3]);
        GameMap.setup(1);
        SceneManager.goto(() => new Scene_Prologue());
      } else if (this.index === 1 && SaveManager.hasSave()) {
        SaveManager.load();
        SceneManager.goto(() => new Scene_Map());
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBackdrop(ctx, "#181433", "#0a0a12");
    drawStarfield(ctx, this.time, 90);

    ctx.save();
    ctx.strokeStyle = "rgba(242, 193, 78, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, ctx.canvas.width - 48, ctx.canvas.height - 48);
    ctx.strokeStyle = "rgba(242, 193, 78, 0.2)";
    ctx.strokeRect(30, 30, ctx.canvas.width - 60, ctx.canvas.height - 60);
    ctx.restore();

    drawText(ctx, DataManager.story().worldName.toUpperCase(), ctx.canvas.width / 2, 92, Palette.gold, "bold 42px sans-serif", "center");

    ctx.save();
    ctx.strokeStyle = "rgba(200, 182, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2 - 90, 142);
    ctx.lineTo(ctx.canvas.width / 2 + 90, 142);
    ctx.stroke();
    ctx.restore();

    drawText(ctx, "A Sable Blight Chronicle", ctx.canvas.width / 2, 152, "#c8b6ff", "16px sans-serif", "center");

    const boxW = 240;
    const boxH = COMMANDS.length * 36 + 24;
    const boxX = ctx.canvas.width / 2 - boxW / 2;
    const boxY = ctx.canvas.height - boxH - 90;
    drawWindow(ctx, boxX, boxY, boxW, boxH);

    const pulse = 0.75 + 0.25 * Math.sin(this.time * 4);
    COMMANDS.forEach((cmd, i) => {
      const y = boxY + 14 + i * 36;
      const selected = i === this.index;
      const disabled = cmd === "Continue" && !SaveManager.hasSave();
      const color = disabled ? Palette.disabled : selected ? Palette.accent : Palette.text;
      if (selected) {
        ctx.save();
        ctx.globalAlpha = pulse;
        drawText(ctx, "▶", ctx.canvas.width / 2 - boxW / 2 + 26, y, Palette.gold, "16px sans-serif", "center");
        ctx.restore();
      }
      drawText(ctx, cmd, ctx.canvas.width / 2, y, color, "18px sans-serif", "center");
    });

    drawFooterHint(ctx, "Arrow keys to select, Enter to confirm");
    drawText(ctx, "v0.1 demo", 16, ctx.canvas.height - 26, Palette.textFaint, "11px sans-serif");
  }
}

