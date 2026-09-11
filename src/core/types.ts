// Shared data model types, analogous to RPG Maker MV's data/*.json schemas.

export interface StatGrowth {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  agi: number;
}

export interface ActorData {
  id: number;
  name: string;
  className: string;
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  agi: number;
  skillIds: number[];
  faceColor: string;
  growth: StatGrowth;
  initialWeaponId: number;
  initialArmorId: number;
  profile: string;
}

export interface EnemyData {
  id: number;
  name: string;
  maxHp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  agi: number;
  exp: number;
  gold: number;
  color: string;
  skillIds?: number[];
}

export interface SkillData {
  id: number;
  name: string;
  mpCost: number;
  power: number;
  type: "physical" | "magical" | "heal";
  stateId?: number;
  removeState?: boolean;
  hitRate?: number;
}

export interface ItemData {
  id: number;
  name: string;
  description: string;
  hpRecover: number;
  mpRecover: number;
  removeState?: number;
  price: number;
}

export interface WeaponData {
  id: number;
  name: string;
  atk: number;
  mat: number;
  price: number;
}

export interface ArmorData {
  id: number;
  name: string;
  def: number;
  mdf: number;
  price: number;
}

export interface StateData {
  id: number;
  name: string;
  icon: string;
  turns: number;
  /** damage applied at the end of each turn while afflicted */
  hpPerTurn?: number;
  /** if true, the afflicted battler cannot act */
  paralyze?: boolean;
}

export type MapEvent =
  | { kind: "npc"; x: number; y: number; name: string; dialogue: string[] }
  | { kind: "warp"; x: number; y: number; destMapId: number; destX: number; destY: number }
  | { kind: "shop"; x: number; y: number; name: string; shopId: number }
  | { kind: "savepoint"; x: number; y: number }
  | {
      kind: "boss";
      x: number;
      y: number;
      name: string;
      enemyId: number;
      switchKey: string;
      introLines: string[];
      clearedLines: string[];
    };

export interface MapData {
  id: number;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  encounterList: number[];
  encounterSteps: number;
  startX: number;
  startY: number;
  layout: string[];
  events: MapEvent[];
}

export interface ShopData {
  id: number;
  name: string;
  itemIds: number[];
  weaponIds: number[];
  armorIds: number[];
}

export interface StoryData {
  worldName: string;
  prologue: string[];
  epilogue: string[];
}

export interface GameData {
  actors: ActorData[];
  enemies: EnemyData[];
  skills: SkillData[];
  items: ItemData[];
  weapons: WeaponData[];
  armors: ArmorData[];
  states: StateData[];
  shops: ShopData[];
  maps: Record<number, MapData>;
  story: StoryData;
}

