import { DataManager } from "../core/DataManager";
import type { SkillData, StatGrowth } from "../core/types";

export interface ActiveState {
  stateId: number;
  turnsLeft: number;
}

const EXP_CURVE_BASE = 30;
const EXP_CURVE_POWER = 2.2;
const MAX_LEVEL = 99;

function expForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(EXP_CURVE_BASE * Math.pow(level, EXP_CURVE_POWER));
}

function scale(base: number, rate: number, level: number): number {
  return Math.round(base * Math.pow(rate, level - 1));
}

// Game_Actor: a live, stateful battler built from static ActorData.
// Mirrors RPG Maker MV's Game_Actor / Game_BattlerBase pairing, with
// level-based stat scaling and equippable weapon/armor bonuses.
export class GameActor {
  readonly id: number;
  readonly name: string;
  readonly className: string;
  readonly faceColor: string;
  readonly skillIds: number[];
  readonly profile: string;
  private growth: StatGrowth;
  private baseHp: number;
  private baseMp: number;
  private baseAtk: number;
  private baseDef: number;
  private baseMat: number;
  private baseMdf: number;
  private baseAgi: number;

  level = 1;
  exp = 0;
  hp: number;
  mp: number;
  weaponId: number;
  armorId: number;
  states: ActiveState[] = [];

  constructor(actorId: number) {
    const data = DataManager.actor(actorId);
    this.id = data.id;
    this.name = data.name;
    this.className = data.className;
    this.faceColor = data.faceColor;
    this.skillIds = data.skillIds;
    this.profile = data.profile;
    this.growth = data.growth;
    this.baseHp = data.maxHp;
    this.baseMp = data.maxMp;
    this.baseAtk = data.atk;
    this.baseDef = data.def;
    this.baseMat = data.mat;
    this.baseMdf = data.mdf;
    this.baseAgi = data.agi;
    this.weaponId = data.initialWeaponId;
    this.armorId = data.initialArmorId;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  get maxHp(): number {
    return scale(this.baseHp, this.growth.hp, this.level);
  }
  get maxMp(): number {
    return scale(this.baseMp, this.growth.mp, this.level);
  }
  get atk(): number {
    return scale(this.baseAtk, this.growth.atk, this.level) + (DataManager.weapon(this.weaponId)?.atk ?? 0);
  }
  get def(): number {
    return scale(this.baseDef, this.growth.def, this.level) + (DataManager.armor(this.armorId)?.def ?? 0);
  }
  get mat(): number {
    return scale(this.baseMat, this.growth.mat, this.level) + (DataManager.weapon(this.weaponId)?.mat ?? 0);
  }
  get mdf(): number {
    return scale(this.baseMdf, this.growth.mdf, this.level) + (DataManager.armor(this.armorId)?.mdf ?? 0);
  }
  get agi(): number {
    return scale(this.baseAgi, this.growth.agi, this.level);
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get expToNextLevel(): number {
    if (this.level >= MAX_LEVEL) return 0;
    return expForLevel(this.level + 1) - this.exp;
  }

  skills(): SkillData[] {
    return this.skillIds.map((id) => DataManager.skill(id));
  }

  gainHp(amount: number) {
    this.hp = Math.max(0, Math.min(this.maxHp, this.hp + amount));
  }

  gainMp(amount: number) {
    this.mp = Math.max(0, Math.min(this.maxMp, this.mp + amount));
  }

  reviveFull() {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.states = [];
  }

  /** Adds exp and returns the number of levels gained (0 if none). */
  gainExp(amount: number): number {
    this.exp += amount;
    let levelsGained = 0;
    while (this.level < MAX_LEVEL && this.exp >= expForLevel(this.level + 1)) {
      const oldMaxHp = this.maxHp;
      const oldMaxMp = this.maxMp;
      this.level += 1;
      levelsGained += 1;
      this.hp += this.maxHp - oldMaxHp;
      this.mp += this.maxMp - oldMaxMp;
    }
    return levelsGained;
  }

  isStateAffected(stateId: number): boolean {
    return this.states.some((s) => s.stateId === stateId);
  }

  isParalyzed(): boolean {
    return this.states.some((s) => DataManager.state(s.stateId).paralyze);
  }

  addState(stateId: number) {
    if (this.isStateAffected(stateId)) return;
    const data = DataManager.state(stateId);
    this.states.push({ stateId, turnsLeft: data.turns });
  }

  removeState(stateId: number) {
    this.states = this.states.filter((s) => s.stateId !== stateId);
  }

  removeAllStates() {
    this.states = [];
  }

  /** Ticks state durations by one turn and applies any per-turn effects. Returns log lines. */
  tickStates(): string[] {
    const lines: string[] = [];
    for (const active of [...this.states]) {
      const data = DataManager.state(active.stateId);
      if (data.hpPerTurn) {
        this.gainHp(data.hpPerTurn);
        lines.push(`${this.name} suffers ${-data.hpPerTurn} damage from ${data.name}.`);
      }
      active.turnsLeft -= 1;
      if (active.turnsLeft <= 0) {
        this.removeState(active.stateId);
        lines.push(`${this.name} is no longer afflicted by ${data.name}.`);
      }
    }
    return lines;
  }
}

