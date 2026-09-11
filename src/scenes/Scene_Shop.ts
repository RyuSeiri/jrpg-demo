import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { DataManager } from "../core/DataManager";
import { GameParty } from "../game/GameParty";
import { drawFooterHint, drawHeaderBar, drawListVertical, drawText, drawWindow, Palette } from "../ui/Window";
import { Scene_Map } from "./Scene_Map";

type ShopKind = "item" | "weapon" | "armor";
interface ShopEntry {
  kind: ShopKind;
  id: number;
  name: string;
  price: number;
  count: number;
}

// Scene_Shop: a buy/sell counter, mirroring RPG Maker MV's Scene_Shop.
export class Scene_Shop implements Scene {
  private mode: "buy" | "sell" = "buy";
  private index = 0;
  private message = "";
  private shopId: number;

  constructor(shopId: number) {
    this.shopId = shopId;
  }

  start() {
    this.mode = "buy";
    this.index = 0;
    this.message = "";
  }

  private buyList(): ShopEntry[] {
    const shop = DataManager.shop(this.shopId);
    const items = shop.itemIds.map((id) => {
      const d = DataManager.item(id);
      return { kind: "item" as const, id, name: d.name, price: d.price, count: -1 };
    });
    const weapons = shop.weaponIds.map((id) => {
      const d = DataManager.weapon(id)!;
      return { kind: "weapon" as const, id, name: d.name, price: d.price, count: -1 };
    });
    const armors = shop.armorIds.map((id) => {
      const d = DataManager.armor(id)!;
      return { kind: "armor" as const, id, name: d.name, price: d.price, count: -1 };
    });
    return [...items, ...weapons, ...armors];
  }

  private sellList(): ShopEntry[] {
    const items = GameParty.inventory
      .filter((e) => e.count > 0)
      .map((e) => {
        const d = DataManager.item(e.itemId);
        return { kind: "item" as const, id: e.itemId, name: d.name, price: d.price, count: e.count };
      });
    const weapons = GameParty.ownedWeapons
      .filter((e) => e.count > 0)
      .map((e) => {
        const d = DataManager.weapon(e.id)!;
        return { kind: "weapon" as const, id: e.id, name: d.name, price: d.price, count: e.count };
      });
    const armors = GameParty.ownedArmors
      .filter((e) => e.count > 0)
      .map((e) => {
        const d = DataManager.armor(e.id)!;
        return { kind: "armor" as const, id: e.id, name: d.name, price: d.price, count: e.count };
      });
    return [...items, ...weapons, ...armors];
  }

  private currentList(): ShopEntry[] {
    return this.mode === "buy" ? this.buyList() : this.sellList();
  }

  update() {
    if (Input.isTriggered("Escape")) {
      SceneManager.goto(() => new Scene_Map());
      return;
    }
    if (Input.isTriggered("ArrowLeft") || Input.isTriggered("ArrowRight")) {
      this.mode = this.mode === "buy" ? "sell" : "buy";
      this.index = 0;
      this.message = "";
      return;
    }
    const list = this.currentList();
    if (list.length === 0) return;
    if (Input.isTriggered("ArrowUp")) this.index = (this.index - 1 + list.length) % list.length;
    if (Input.isTriggered("ArrowDown")) this.index = (this.index + 1) % list.length;
    if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
      const entry = list[this.index];
      if (this.mode === "buy") {
        const ok =
          entry.kind === "item"
            ? GameParty.buyItem(entry.id)
            : entry.kind === "weapon"
              ? GameParty.buyWeapon(entry.id)
              : GameParty.buyArmor(entry.id);
        this.message = ok ? `Bought ${entry.name}.` : "Not enough gold!";
      } else {
        const ok =
          entry.kind === "item"
            ? GameParty.sellItem(entry.id)
            : entry.kind === "weapon"
              ? GameParty.sellWeapon(entry.id)
              : GameParty.sellArmor(entry.id);
        this.message = ok ? `Sold ${entry.name}.` : "Nothing to sell!";
        if (list.length > 0) this.index = Math.min(this.index, this.currentList().length - 1 || 0);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const shop = DataManager.shop(this.shopId);
    drawHeaderBar(ctx, shop.name, `Gold: ${GameParty.gold}`);
    drawText(
      ctx,
      `${this.mode === "buy" ? "◀ " : ""}${this.mode === "buy" ? "BUY" : "buy"}  /  ${this.mode === "sell" ? "SELL" : "sell"}${this.mode === "sell" ? " ▶" : ""}`,
      ctx.canvas.width / 2,
      50,
      Palette.accent,
      "bold 15px sans-serif",
      "center"
    );

    drawWindow(ctx, 20, 90, ctx.canvas.width - 40, 340);
    const list = this.currentList();
    if (list.length === 0) {
      drawText(ctx, "(nothing here)", 36, 106, Palette.textFaint, "14px sans-serif");
    }
    drawListVertical(
      ctx,
      list.map((entry) => ({ label: `${entry.name}${entry.count >= 0 ? ` x${entry.count}` : ""}`, value: `${entry.price}g` })),
      36,
      104,
      this.index,
      { lineHeight: 26, font: "15px sans-serif", valueColor: Palette.gold }
    );

    if (this.message) drawText(ctx, this.message, 36, ctx.canvas.height - 56, Palette.heal, "14px sans-serif");
    drawFooterHint(ctx, "Left/Right switch buy-sell · Enter confirm · Esc leave");
  }
}
