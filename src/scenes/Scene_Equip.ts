import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameParty } from "../game/GameParty";
import { DataManager } from "../core/DataManager";
import { drawFooterHint, drawHeaderBar, drawListVertical, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Menu } from "./Scene_Menu";

type Slot = "weapon" | "armor";

// Scene_Equip: swap weapon/armor per party member, mirroring RPG Maker
// MV's Scene_Equip.
export class Scene_Equip implements Scene {
  private actorIndex = 0;
  private slot: Slot = "weapon";
  private browsing = false;
  private browseIndex = 0;

  start() {
    this.actorIndex = 0;
    this.slot = "weapon";
    this.browsing = false;
  }

  private candidateIds(): number[] {
    const owned = this.slot === "weapon" ? GameParty.ownedWeapons : GameParty.ownedArmors;
    return [0, ...owned.filter((e) => e.count > 0).map((e) => e.id)];
  }

  private nameFor(id: number): string {
    if (id === 0) return "(none)";
    return this.slot === "weapon" ? DataManager.weapon(id)!.name : DataManager.armor(id)!.name;
  }

  update() {
    const actor = GameParty.members[this.actorIndex];

    if (this.browsing) {
      const ids = this.candidateIds();
      if (Input.isTriggered("Escape")) {
        this.browsing = false;
        return;
      }
      if (Input.isTriggered("ArrowUp")) this.browseIndex = (this.browseIndex - 1 + ids.length) % ids.length;
      if (Input.isTriggered("ArrowDown")) this.browseIndex = (this.browseIndex + 1) % ids.length;
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const id = ids[this.browseIndex];
        if (this.slot === "weapon") GameParty.equipWeapon(actor, id);
        else GameParty.equipArmor(actor, id);
        this.browsing = false;
      }
      return;
    }

    if (Input.isTriggered("Escape")) {
      SceneManager.goto(() => new Scene_Menu());
      return;
    }
    const n = GameParty.members.length;
    if (Input.isTriggered("ArrowLeft")) this.actorIndex = (this.actorIndex - 1 + n) % n;
    if (Input.isTriggered("ArrowRight")) this.actorIndex = (this.actorIndex + 1) % n;
    if (Input.isTriggered("ArrowUp") || Input.isTriggered("ArrowDown")) {
      this.slot = this.slot === "weapon" ? "armor" : "weapon";
    }
    if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
      this.browsing = true;
      this.browseIndex = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const actor = GameParty.members[this.actorIndex];
    drawHeaderBar(ctx, "Equip", "Left/Right character · Up/Down slot");

    drawWindow(ctx, 20, 60, ctx.canvas.width - 40, 120);
    drawText(ctx, `${actor.name} (${actor.className})`, 36, 76, Palette.text, "bold 18px sans-serif");
    (["weapon", "armor"] as Slot[]).forEach((slot, i) => {
      const selected = this.slot === slot && !this.browsing;
      const id = slot === "weapon" ? actor.weaponId : actor.armorId;
      const name = id === 0 ? "(none)" : slot === "weapon" ? DataManager.weapon(id)!.name : DataManager.armor(id)!.name;
      drawText(
        ctx,
        (selected ? "> " : "  ") + `${slot === "weapon" ? "Weapon" : "Armor "}: ${name}`,
        36,
        108 + i * 26,
        selected ? Palette.accent : Palette.text,
        "15px sans-serif"
      );
    });

    if (this.browsing) {
      const ids = this.candidateIds();
      drawWindow(ctx, 20, 200, ctx.canvas.width - 40, 200);
      drawText(ctx, `Choose ${this.slot}:`, 36, 214, Palette.textDim, "13px sans-serif");
      drawListVertical(
        ctx,
        ids.map((id) => ({ label: this.nameFor(id) })),
        36,
        240,
        this.browseIndex,
        { lineHeight: 22, font: "14px sans-serif" }
      );
    }

    drawFooterHint(ctx, this.browsing ? "Up/Down choose, Enter confirm, Esc cancel" : "Enter to change, Esc to return to the menu");
  }
}
