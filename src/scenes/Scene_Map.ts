import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameMap, TILE_WALL } from "../game/GameMap";
import { GameParty } from "../game/GameParty";
import { GameSwitches } from "../game/GameSwitches";
import { SaveManager } from "../game/SaveManager";
import { drawFooterHint, drawGauge, drawHeaderBar, drawPortrait, drawShadow, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Battle } from "./Scene_Battle";
import { Scene_Menu } from "./Scene_Menu";
import { Scene_Shop } from "./Scene_Shop";

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

const CHARS_PER_SECOND = 42;

function npcColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

// Scene_Map: mirrors RPG Maker MV's Scene_Map. Renders the tile grid,
// handles player movement/interaction with map events, and rolls random
// encounters that hand off control to Scene_Battle.
export class Scene_Map implements Scene {
  private moveCooldown = 0;
  private dialogue: string[] | null = null;
  private dialogueSpeaker = "";
  private dialogueIndex = 0;
  private dialogueCharProgress = 0;
  private toast = "";
  private toastTimer = 0;
  private time = 0;
  private afterDialogue: (() => void) | null = null;

  start() {
    this.moveCooldown = 0;
    this.dialogue = null;
  }

  private currentLine(): string {
    return this.dialogue?.[this.dialogueIndex] ?? "";
  }

  private isLineRevealed(): boolean {
    return this.dialogueCharProgress >= this.currentLine().length;
  }

  private showDialogue(speaker: string, lines: string[], after?: () => void) {
    this.dialogueSpeaker = speaker;
    this.dialogue = lines;
    this.dialogueIndex = 0;
    this.dialogueCharProgress = 0;
    this.afterDialogue = after ?? null;
  }

  update(dt: number) {
    this.time += dt;
    if (this.toastTimer > 0) this.toastTimer -= dt;

    if (this.dialogue) {
      if (!this.isLineRevealed()) this.dialogueCharProgress += CHARS_PER_SECOND * dt;
      if (Input.isTriggered("Enter") || Input.isTriggered(" ") || Input.isTriggered("Escape")) {
        if (!this.isLineRevealed()) {
          this.dialogueCharProgress = this.currentLine().length;
        } else {
          this.dialogueIndex += 1;
          if (this.dialogueIndex >= this.dialogue.length) {
            this.dialogue = null;
            const after = this.afterDialogue;
            this.afterDialogue = null;
            if (after) after();
          } else {
            this.dialogueCharProgress = 0;
          }
        }
      }
      return;
    }

    if (Input.isTriggered("Escape")) {
      SceneManager.goto(() => new Scene_Menu());
      return;
    }

    if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
      const event = GameMap.eventInFront();
      if (event?.kind === "npc") {
        this.showDialogue(event.name, event.dialogue);
        return;
      }
      if (event?.kind === "shop") {
        SceneManager.goto(() => new Scene_Shop(event.shopId));
        return;
      }
      if (event?.kind === "savepoint") {
        GameParty.healAllFully();
        SaveManager.save();
        this.toast = "Party fully rested and the game was saved!";
        this.toastTimer = 1.8;
        return;
      }
      if (event?.kind === "boss") {
        const cleared = GameSwitches.get(event.switchKey);
        if (cleared) {
          this.showDialogue(event.name, event.clearedLines);
        } else {
          this.showDialogue(event.name, event.introLines, () => {
            SceneManager.goto(() => new Scene_Battle([event.enemyId], { bossSwitchKey: event.switchKey }));
          });
        }
        return;
      }
    }

    if (this.moveCooldown > 0) {
      this.moveCooldown -= dt;
      return;
    }

    for (const [key, [dx, dy]] of Object.entries(MOVE_KEYS)) {
      if (Input.isPressed(key)) {
        const moved = GameMap.tryMove(dx, dy);
        if (moved) {
          this.moveCooldown = 0.14;
          const warp = GameMap.eventUnderPlayer();
          if (warp?.kind === "warp") {
            GameMap.setup(warp.destMapId, warp.destX, warp.destY);
            return;
          }
          const encounterEnemyId = GameMap.checkEncounter();
          if (encounterEnemyId !== null) {
            SceneManager.goto(() => new Scene_Battle(this.rollTroop(encounterEnemyId)));
          }
        }
        break;
      }
    }
  }

  /** Builds a 1-3 enemy group, occasionally mixing in a second enemy type for variety. */
  private rollTroop(baseEnemyId: number): number[] {
    const count = 1 + Math.floor(Math.random() * 2);
    const troop = [baseEnemyId];
    for (let i = 1; i < count; i++) {
      const list = GameMap.encounterList;
      const mixIn = Math.random() < 0.5 ? baseEnemyId : list[Math.floor(Math.random() * list.length)];
      troop.push(mixIn);
    }
    return troop;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const isTown = GameMap.mapId === 2;
    ctx.fillStyle = isTown ? "#241a12" : "#0d1a10";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const size = GameMap.tileSize;
    const offsetX = (ctx.canvas.width - GameMap.width * size) / 2;
    const offsetY = 60;

    for (let y = 0; y < GameMap.height; y++) {
      for (let x = 0; x < GameMap.width; x++) {
        const tile = GameMap.tileAt(x, y);
        const px = offsetX + x * size;
        const py = offsetY + y * size;
        if (tile === TILE_WALL) {
          ctx.fillStyle = isTown ? "#4a3626" : "#2b2b3d";
          ctx.fillRect(px, py, size - 1, size - 1);
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.strokeRect(px + 2, py + 2, size - 5, size - 5);
        } else {
          const shade = Math.sin(x * 12.9898 + y * 78.233) * 0.5 + 0.5;
          const base = isTown ? [90, 74, 56] : [34, 74, 42];
          const boost = Math.round(shade * 14);
          ctx.fillStyle = `rgb(${base[0] + boost}, ${base[1] + boost}, ${base[2] + boost})`;
          ctx.fillRect(px, py, size - 1, size - 1);
        }
      }
    }

    for (const event of GameMap.events) {
      const cx = offsetX + event.x * size + size / 2;
      const cy = offsetY + event.y * size + size / 2;
      drawShadow(ctx, cx, cy + size / 3, size / 3);
      if (event.kind === "npc") {
        drawPortrait(ctx, cx - size / 2.6, cy - size / 2.6, size / 1.3, npcColor(event.name), event.name[0]);
      } else if (event.kind === "shop") {
        ctx.fillStyle = "#e0a458";
        ctx.fillRect(cx - size / 2.6, cy - size / 2.6, size / 1.3, size / 1.3);
        drawText(ctx, "$", cx, cy - 9, "#3a2a10", "bold 16px sans-serif", "center");
      } else if (event.kind === "savepoint") {
        ctx.fillStyle = "#7ee787";
        ctx.beginPath();
        ctx.arc(cx, cy, size / 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (event.kind === "warp") {
        ctx.fillStyle = "#c8b6ff";
        ctx.fillRect(cx - size / 2.4, cy - size / 2.4, size / 1.2, size / 1.2);
      } else if (event.kind === "boss") {
        const cleared = GameSwitches.get(event.switchKey);
        ctx.fillStyle = cleared ? "#7ee787" : "#7d2ae8";
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 1.8);
        ctx.lineTo(cx + size / 1.8, cy + size / 2.4);
        ctx.lineTo(cx - size / 1.8, cy + size / 2.4);
        ctx.closePath();
        ctx.fill();
        drawText(ctx, cleared ? "✓" : "!", cx, cy - 6, "#10121c", "bold 14px sans-serif", "center");
      }
    }

    // player
    const playerCx = offsetX + GameMap.playerX * size + size / 2;
    const playerCy = offsetY + GameMap.playerY * size + size / 2;
    drawShadow(ctx, playerCx, playerCy + size / 3, size / 3);
    drawPortrait(ctx, playerCx - size / 2.4, playerCy - size / 2.4, size / 1.2, "#f2c14e", "A");

    drawHeaderBar(ctx, GameMap.name);
    GameParty.members.forEach((m, i) => {
      const x = ctx.canvas.width - 250 + i * 84;
      drawText(ctx, m.name, x, 6, Palette.textDim, "10px sans-serif");
      drawGauge(ctx, x, 20, 72, 6, m.hp / m.maxHp, m.hp / m.maxHp > 0.3 ? Palette.hp : Palette.danger);
    });
    drawFooterHint(ctx, "Arrows/WASD move \u00b7 Enter interact \u00b7 Esc menu");

    if (this.toastTimer > 0) {
      drawWindow(ctx, ctx.canvas.width / 2 - 120, 50, 240, 30);
      drawText(ctx, this.toast, ctx.canvas.width / 2, 58, Palette.heal, "14px sans-serif", "center");
    }

    if (this.dialogue) {
      const h = 100;
      const boxY = ctx.canvas.height - h - 20;
      drawWindow(ctx, 20, boxY, ctx.canvas.width - 40, h);
      drawPortrait(ctx, 34, boxY + 14, 54, npcColor(this.dialogueSpeaker), this.dialogueSpeaker[0] ?? "?");
      drawText(ctx, this.dialogueSpeaker, 100, boxY + 12, Palette.accent, "bold 15px sans-serif");
      drawText(ctx, this.currentLine().slice(0, Math.floor(this.dialogueCharProgress)), 100, boxY + 36, Palette.text, "15px sans-serif");
      drawText(ctx, "Enter to continue", ctx.canvas.width - 36, boxY + h - 24, Palette.textDim, "12px sans-serif", "right");
    }
  }
}


