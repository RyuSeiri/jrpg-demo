import { GameActor } from "./GameActor";
import { DataManager } from "../core/DataManager";

export interface InventoryEntry {
  itemId: number;
  count: number;
}

export interface EquipEntry {
  id: number;
  count: number;
}

// Game_Party: the singleton party/inventory state.
// Mirrors RPG Maker MV's $gameParty, exposed here as one shared instance
// instead of a bare global variable.
class GamePartyImpl {
  members: GameActor[] = [];
  gold = 0;
  inventory: InventoryEntry[] = [];
  ownedWeapons: EquipEntry[] = [];
  ownedArmors: EquipEntry[] = [];

  setupInitialParty(actorIds: number[]) {
    this.members = actorIds.map((id) => new GameActor(id));
    this.gold = 80;
    this.inventory = [
      { itemId: 1, count: 3 },
      { itemId: 2, count: 2 },
      { itemId: 3, count: 1 },
    ];
    this.ownedWeapons = [];
    this.ownedArmors = [];
  }

  aliveMembers(): GameActor[] {
    return this.members.filter((m) => m.isAlive);
  }

  isAllDead(): boolean {
    return this.members.every((m) => !m.isAlive);
  }

  gainGold(amount: number) {
    this.gold = Math.max(0, this.gold + amount);
  }

  itemCount(itemId: number): number {
    return this.inventory.find((e) => e.itemId === itemId)?.count ?? 0;
  }

  gainItem(itemId: number, count = 1) {
    const entry = this.inventory.find((e) => e.itemId === itemId);
    if (entry) entry.count += count;
    else this.inventory.push({ itemId, count });
  }

  consumeItem(itemId: number): boolean {
    const entry = this.inventory.find((e) => e.itemId === itemId);
    if (!entry || entry.count <= 0) return false;
    entry.count -= 1;
    return true;
  }

  usableItems() {
    return this.inventory
      .filter((e) => e.count > 0)
      .map((e) => ({ ...DataManager.item(e.itemId), count: e.count }));
  }

  gainWeapon(weaponId: number, count = 1) {
    const entry = this.ownedWeapons.find((e) => e.id === weaponId);
    if (entry) entry.count += count;
    else this.ownedWeapons.push({ id: weaponId, count });
  }

  gainArmor(armorId: number, count = 1) {
    const entry = this.ownedArmors.find((e) => e.id === armorId);
    if (entry) entry.count += count;
    else this.ownedArmors.push({ id: armorId, count });
  }

  private takeWeapon(weaponId: number): boolean {
    const entry = this.ownedWeapons.find((e) => e.id === weaponId);
    if (!entry || entry.count <= 0) return false;
    entry.count -= 1;
    return true;
  }

  private takeArmor(armorId: number): boolean {
    const entry = this.ownedArmors.find((e) => e.id === armorId);
    if (!entry || entry.count <= 0) return false;
    entry.count -= 1;
    return true;
  }

  /** Equips weaponId on the actor, returning the previously equipped weapon to inventory. */
  equipWeapon(actor: GameActor, weaponId: number): boolean {
    if (weaponId !== 0 && !this.takeWeapon(weaponId)) return false;
    if (actor.weaponId !== 0) this.gainWeapon(actor.weaponId);
    actor.weaponId = weaponId;
    return true;
  }

  equipArmor(actor: GameActor, armorId: number): boolean {
    if (armorId !== 0 && !this.takeArmor(armorId)) return false;
    if (actor.armorId !== 0) this.gainArmor(actor.armorId);
    actor.armorId = armorId;
    return true;
  }

  buyItem(itemId: number): boolean {
    const item = DataManager.item(itemId);
    if (this.gold < item.price) return false;
    this.gold -= item.price;
    this.gainItem(itemId);
    return true;
  }

  sellItem(itemId: number): boolean {
    if (!this.consumeItem(itemId)) return false;
    this.gold += Math.floor(DataManager.item(itemId).price / 2);
    return true;
  }

  buyWeapon(weaponId: number): boolean {
    const weapon = DataManager.weapon(weaponId);
    if (!weapon || this.gold < weapon.price) return false;
    this.gold -= weapon.price;
    this.gainWeapon(weaponId);
    return true;
  }

  buyArmor(armorId: number): boolean {
    const armor = DataManager.armor(armorId);
    if (!armor || this.gold < armor.price) return false;
    this.gold -= armor.price;
    this.gainArmor(armorId);
    return true;
  }

  sellWeapon(weaponId: number): boolean {
    if (!this.takeWeapon(weaponId)) return false;
    this.gold += Math.floor((DataManager.weapon(weaponId)?.price ?? 0) / 2);
    return true;
  }

  sellArmor(armorId: number): boolean {
    if (!this.takeArmor(armorId)) return false;
    this.gold += Math.floor((DataManager.armor(armorId)?.price ?? 0) / 2);
    return true;
  }

  healAllFully() {
    for (const m of this.members) m.reviveFull();
  }
}

export const GameParty = new GamePartyImpl();

