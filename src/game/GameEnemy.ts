import { DataManager } from "../core/DataManager";
import type { ActiveState } from "./GameActor";

// Game_Enemy: a live battler spawned from static EnemyData for one battle.
export class GameEnemy {
  readonly enemyId: number;
  readonly name: string;
  readonly color: string;
  readonly maxHp: number;
  readonly atk: number;
  readonly def: number;
  readonly mat: number;
  readonly mdf: number;
  readonly agi: number;
  readonly exp: number;
  readonly gold: number;
  readonly skillIds: number[];

  hp: number;
  states: ActiveState[] = [];

  constructor(enemyId: number) {
    const data = DataManager.enemy(enemyId);
    this.enemyId = data.id;
    this.name = data.name;
    this.color = data.color;
    this.maxHp = data.maxHp;
    this.atk = data.atk;
    this.def = data.def;
    this.mat = data.mat;
    this.mdf = data.mdf;
    this.agi = data.agi;
    this.exp = data.exp;
    this.gold = data.gold;
    this.skillIds = data.skillIds ?? [];
    this.hp = this.maxHp;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  gainHp(amount: number) {
    this.hp = Math.max(0, Math.min(this.maxHp, this.hp + amount));
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

  tickStates(): string[] {
    const lines: string[] = [];
    for (const active of [...this.states]) {
      const data = DataManager.state(active.stateId);
      if (data.hpPerTurn) {
        this.gainHp(data.hpPerTurn);
        lines.push(`${this.name} suffers ${-data.hpPerTurn} damage from ${data.name}.`);
      }
      active.turnsLeft -= 1;
      if (active.turnsLeft <= 0) this.removeState(active.stateId);
    }
    return lines;
  }
}

