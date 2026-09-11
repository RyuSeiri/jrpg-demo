import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameParty } from "../game/GameParty";
import { SaveManager } from "../game/SaveManager";
import { drawFooterHint, drawGauge, drawHeaderBar, drawListVertical, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Map } from "./Scene_Map";
import { Scene_Status } from "./Scene_Status";
import { Scene_Equip } from "./Scene_Equip";

const COMMANDS = ["Items", "Status", "Equip", "Save", "Close"];

// Scene_Menu: mirrors RPG Maker MV's Scene_Menu command + status window.
export class Scene_Menu implements Scene {
  private commandIndex = 0;
  private message = "";
  private usingItem = false;
  private itemIndex = 0;
  private targetIndex = 0;
  private pickingTarget = false;

  start() {
    this.commandIndex = 0;
    this.message = "";
    this.usingItem = false;
    this.pickingTarget = false;
  }

  update() {
    if (this.pickingTarget) {
      const items = GameParty.usableItems();
      const item = items[this.itemIndex];
      if (!item) {
        this.pickingTarget = false;
        this.usingItem = false;
        return;
      }
      if (Input.isTriggered("Escape")) {
        this.pickingTarget = false;
        return;
      }
      if (Input.isTriggered("ArrowUp")) this.targetIndex = (this.targetIndex - 1 + GameParty.members.length) % GameParty.members.length;
      if (Input.isTriggered("ArrowDown")) this.targetIndex = (this.targetIndex + 1) % GameParty.members.length;
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const target = GameParty.members[this.targetIndex];
        if (GameParty.consumeItem(item.id)) {
          target.gainHp(item.hpRecover);
          target.gainMp(item.mpRecover);
          if (item.removeState) target.removeState(item.removeState);
          this.message = `Used ${item.name} on ${target.name}.`;
        }
        this.pickingTarget = false;
        if (GameParty.itemCount(item.id) <= 0) this.usingItem = false;
      }
      return;
    }

    if (this.usingItem) {
      const items = GameParty.usableItems();
      if (items.length === 0) {
        this.usingItem = false;
        return;
      }
      if (Input.isTriggered("Escape")) {
        this.usingItem = false;
        return;
      }
      if (Input.isTriggered("ArrowUp")) this.itemIndex = (this.itemIndex - 1 + items.length) % items.length;
      if (Input.isTriggered("ArrowDown")) this.itemIndex = (this.itemIndex + 1) % items.length;
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        this.pickingTarget = true;
        this.targetIndex = 0;
      }
      return;
    }

    if (Input.isTriggered("Escape")) {
      SceneManager.goto(() => new Scene_Map());
      return;
    }
    if (Input.isTriggered("ArrowUp")) this.commandIndex = (this.commandIndex - 1 + COMMANDS.length) % COMMANDS.length;
    if (Input.isTriggered("ArrowDown")) this.commandIndex = (this.commandIndex + 1) % COMMANDS.length;
    if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
      const cmd = COMMANDS[this.commandIndex];
      if (cmd === "Items") {
        if (GameParty.usableItems().length > 0) {
          this.usingItem = true;
          this.itemIndex = 0;
        }
      } else if (cmd === "Status") SceneManager.goto(() => new Scene_Status());
      else if (cmd === "Equip") SceneManager.goto(() => new Scene_Equip());
      else if (cmd === "Save") {
        SaveManager.save();
        this.message = "Game saved!";
      } else if (cmd === "Close") SceneManager.goto(() => new Scene_Map());
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawHeaderBar(ctx, "Menu", `Gold: ${GameParty.gold}`);

    drawWindow(ctx, 20, 60, 160, COMMANDS.length * 30 + 20);
    drawListVertical(
      ctx,
      COMMANDS.map((cmd) => ({ label: cmd })),
      36,
      72,
      this.usingItem ? -1 : this.commandIndex,
      { lineHeight: 30, font: "16px sans-serif" }
    );

    drawWindow(ctx, 200, 60, ctx.canvas.width - 220, 200);
    GameParty.members.forEach((m, i) => {
      const y = 76 + i * 60;
      const targeted = this.pickingTarget && i === this.targetIndex;
      drawText(ctx, `${targeted ? "> " : "  "}${m.name}  Lv${m.level} (${m.className})`, 216, y, targeted ? Palette.accent : Palette.text, "16px sans-serif");
      drawText(ctx, `HP ${m.hp}/${m.maxHp}`, 216, y + 20, "#f2f2f2", "13px sans-serif");
      drawGauge(ctx, 310, y + 22, 140, 8, m.hp / m.maxHp, Palette.hp);
      drawText(ctx, `MP ${m.mp}/${m.maxMp}`, 480, y + 20, "#c8b6ff", "13px sans-serif");
      drawGauge(ctx, 560, y + 22, 140, 8, m.maxMp ? m.mp / m.maxMp : 0, Palette.mp);
    });

    drawWindow(ctx, 200, 280, ctx.canvas.width - 220, 120);
    drawText(ctx, this.usingItem ? "Choose an item to use" : "Inventory", 216, 296, Palette.accent, "15px sans-serif");
    drawListVertical(
      ctx,
      GameParty.usableItems().map((item) => ({ label: `${item.name} x${item.count}` })),
      216,
      324,
      this.usingItem ? this.itemIndex : -1,
      { lineHeight: 22, font: "14px sans-serif" }
    );

    if (this.message) drawText(ctx, this.message, 20, ctx.canvas.height - 50, Palette.heal, "14px sans-serif");
    const hint = this.pickingTarget
      ? "Up/Down choose ally, Enter to use, Esc to cancel"
      : this.usingItem
        ? "Up/Down choose item, Enter to select target, Esc to cancel"
        : "Enter to select, Esc to return to the map";
    drawFooterHint(ctx, hint);
  }
}


