import type { GameData } from "./types";
import actorsJson from "../data/actors.json";
import enemiesJson from "../data/enemies.json";
import skillsJson from "../data/skills.json";
import itemsJson from "../data/items.json";
import weaponsJson from "../data/weapons.json";
import armorsJson from "../data/armors.json";
import statesJson from "../data/states.json";
import shopsJson from "../data/shops.json";
import map001Json from "../data/map001.json";
import map002Json from "../data/map002.json";
import storyJson from "../data/story.json";
import type {
  ActorData,
  EnemyData,
  SkillData,
  ItemData,
  WeaponData,
  ArmorData,
  StateData,
  ShopData,
  MapData,
  StoryData,
} from "./types";

// DataManager: loads and exposes the static, read-only game database.
// Mirrors RPG Maker MV's $dataActors / $dataEnemies / $dataSkills globals,
// but scoped behind a single module instead of window-level globals.
class DataManagerImpl {
  private data: GameData = {
    actors: actorsJson as ActorData[],
    enemies: enemiesJson as EnemyData[],
    skills: skillsJson as SkillData[],
    items: itemsJson as ItemData[],
    weapons: weaponsJson as WeaponData[],
    armors: armorsJson as ArmorData[],
    states: statesJson as StateData[],
    shops: shopsJson as ShopData[],
    maps: { 1: map001Json as MapData, 2: map002Json as MapData },
    story: storyJson as StoryData,
  };

  story(): StoryData {
    return this.data.story;
  }

  actor(id: number): ActorData {
    const found = this.data.actors.find((a) => a.id === id);
    if (!found) throw new Error(`Unknown actor id: ${id}`);
    return found;
  }

  enemy(id: number): EnemyData {
    const found = this.data.enemies.find((e) => e.id === id);
    if (!found) throw new Error(`Unknown enemy id: ${id}`);
    return found;
  }

  skill(id: number): SkillData {
    const found = this.data.skills.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown skill id: ${id}`);
    return found;
  }

  item(id: number): ItemData {
    const found = this.data.items.find((i) => i.id === id);
    if (!found) throw new Error(`Unknown item id: ${id}`);
    return found;
  }

  weapon(id: number): WeaponData | null {
    if (id === 0) return null;
    const found = this.data.weapons.find((w) => w.id === id);
    if (!found) throw new Error(`Unknown weapon id: ${id}`);
    return found;
  }

  armor(id: number): ArmorData | null {
    if (id === 0) return null;
    const found = this.data.armors.find((a) => a.id === id);
    if (!found) throw new Error(`Unknown armor id: ${id}`);
    return found;
  }

  state(id: number): StateData {
    const found = this.data.states.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown state id: ${id}`);
    return found;
  }

  shop(id: number): ShopData {
    const found = this.data.shops.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown shop id: ${id}`);
    return found;
  }

  map(id: number): MapData {
    const found = this.data.maps[id];
    if (!found) throw new Error(`Unknown map id: ${id}`);
    return found;
  }

  allActors(): ActorData[] {
    return this.data.actors;
  }

  allWeapons(): WeaponData[] {
    return this.data.weapons;
  }

  allArmors(): ArmorData[] {
    return this.data.armors;
  }
}

export const DataManager = new DataManagerImpl();

