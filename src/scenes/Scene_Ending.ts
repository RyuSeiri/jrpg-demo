import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { DataManager } from "../core/DataManager";
import { GameParty } from "../game/GameParty";
import { drawBackdrop, drawPortrait, drawStarfield, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Map } from "./Scene_Map";

const CHARS_PER_SECOND = 38;

// Scene_Ending: the epilogue crawl shown after the shrine boss is cleared,
// giving the demo an actual narrative payoff instead of looping forever.
export class Scene_Ending implements Scene {
  private pageIndex = 0;
  private charProgress = 0;
  private time = 0;

  private get pages(): string[] {
    return DataManager.story().epilogue;
  }

  start() {
    this.pageIndex = 0;
    this.charProgress = 0;
    this.time = 0;
  }

  private currentPage(): string {
    return this.pages[this.pageIndex] ?? "";
  }

  private isPageRevealed(): boolean {
    return this.charProgress >= this.currentPage().length;
  }

  update(dt: number) {
    this.time += dt;
    if (!this.isPageRevealed()) {
      this.charProgress += CHARS_PER_SECOND * dt;
    }

    if (Input.isTriggered("Enter") || Input.isTriggered(" ") || Input.isTriggered("Escape")) {
      if (!this.isPageRevealed()) {
        this.charProgress = this.currentPage().length;
        return;
      }
      this.pageIndex += 1;
      this.charProgress = 0;
      if (this.pageIndex >= this.pages.length) {
        SceneManager.goto(() => new Scene_Map());
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBackdrop(ctx, "#1a1030", "#050509");
    drawStarfield(ctx, this.time, 120);

    drawText(ctx, "EPILOGUE", ctx.canvas.width / 2, 40, Palette.gold, "bold 26px sans-serif", "center");

    const boxH = 180;
    const boxY = ctx.canvas.height - boxH - 90;
    drawWindow(ctx, 60, boxY, ctx.canvas.width - 120, boxH);

    const shown = this.currentPage().slice(0, Math.floor(this.charProgress));
    wrapText(ctx, shown, 84, boxY + 26, ctx.canvas.width - 168, 26);

    drawText(
      ctx,
      this.isPageRevealed() ? "Enter to continue" : "Enter to skip",
      ctx.canvas.width - 84,
      boxY + boxH - 28,
      Palette.textDim,
      "13px sans-serif",
      "right"
    );
    drawText(ctx, `${this.pageIndex + 1} / ${this.pages.length}`, 84, boxY + boxH - 28, Palette.textFaint, "13px sans-serif");

    GameParty.members.forEach((m, i) => {
      const x = 100 + i * 220;
      const y = ctx.canvas.height - 70;
      drawPortrait(ctx, x, y, 48, m.faceColor, m.name[0]);
      drawText(ctx, m.name, x + 60, y + 6, Palette.text, "15px sans-serif");
      drawText(ctx, `Lv${m.level} ${m.className}`, x + 60, y + 26, Palette.textDim, "12px sans-serif");
    });
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  ctx.save();
  ctx.font = "16px sans-serif";
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      drawText(ctx, line, x, cy, "#f0f0f5", "16px sans-serif");
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) drawText(ctx, line, x, cy, "#f0f0f5", "16px sans-serif");
  ctx.restore();
}
