import { GameActor } from "./GameActor";
import { GameParty } from "./GameParty";
import { GameMap } from "./GameMap";

const SAVE_KEY = "jrpg-demo-save-v1";

interface SavedActor {
  id: number;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  weaponId: number;
  armorId: number;
}

interface SaveData {
  members: SavedActor[];
  gold: number;
  inventory: { itemId: number; count: number }[];
  ownedWeapons: { id: number; count: number }[];
  ownedArmors: { id: number; count: number }[];
  mapId: number;
  playerX: number;
  playerY: number;
}

// SaveManager: serializes the singleton game-object state to localStorage.
// Mirrors RPG Maker MV's DataManager.saveGame/loadGame, minus the file slots.
class SaveManagerImpl {
  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  save() {
    const data: SaveData = {
      members: GameParty.members.map((m) => ({
        id: m.id,
        level: m.level,
        exp: m.exp,
        hp: m.hp,
        mp: m.mp,
        weaponId: m.weaponId,
        armorId: m.armorId,
      })),
      gold: GameParty.gold,
      inventory: GameParty.inventory,
      ownedWeapons: GameParty.ownedWeapons,
      ownedArmors: GameParty.ownedArmors,
      mapId: GameMap.mapId,
      playerX: GameMap.playerX,
      playerY: GameMap.playerY,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  /** Returns false if there is no valid save to load. */
  load(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as SaveData;

    GameParty.members = data.members.map((saved) => {
      const actor = new GameActor(saved.id);
      actor.level = saved.level;
      actor.exp = saved.exp;
      actor.weaponId = saved.weaponId;
      actor.armorId = saved.armorId;
      actor.hp = saved.hp;
      actor.mp = saved.mp;
      return actor;
    });
    GameParty.gold = data.gold;
    GameParty.inventory = data.inventory;
    GameParty.ownedWeapons = data.ownedWeapons;
    GameParty.ownedArmors = data.ownedArmors;
    GameMap.setup(data.mapId, data.playerX, data.playerY);
    return true;
  }
}

export const SaveManager = new SaveManagerImpl();
