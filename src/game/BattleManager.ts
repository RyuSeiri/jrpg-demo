import { GameActor } from "./GameActor";
import { GameEnemy } from "./GameEnemy";
import { GameParty } from "./GameParty";
import { DataManager } from "../core/DataManager";

export type BattleAction =
  | { kind: "attack"; actor: GameActor; target: GameEnemy }
  | { kind: "skill"; actor: GameActor; skillId: number; target: GameEnemy | GameActor }
  | { kind: "item"; actor: GameActor; itemId: number; target: GameActor }
  | { kind: "defend"; actor: GameActor };

export type BattleResult = "ongoing" | "victory" | "defeat";

/** A single damage/heal effect, returned so the scene can play a floating popup / shake / flash. */
export interface EffectResult {
  target: GameActor | GameEnemy;
  amount: number;
  isHeal: boolean;
}

// BattleManager: resolves one turn-based encounter at a time.
// Mirrors RPG Maker MV's BattleManager, condensed to a simple
// damage-formula + turn-order resolver with a log of text lines.
class BattleManagerImpl {
  enemies: GameEnemy[] = [];
  log: string[] = [];
  private defending = new Set<GameActor | GameEnemy>();

  setup(enemyIds: number[]) {
    this.enemies = enemyIds.map((id) => new GameEnemy(id));
    this.log = [`A wild encounter begins! (${this.enemies.length} enem${this.enemies.length === 1 ? "y" : "ies"})`];
    this.defending.clear();
  }

  aliveEnemies(): GameEnemy[] {
    return this.enemies.filter((e) => e.isAlive);
  }

  isDefending(unit: GameActor | GameEnemy): boolean {
    return this.defending.has(unit);
  }

  clearDefend(unit: GameActor | GameEnemy) {
    this.defending.delete(unit);
  }

  private physicalDamage(atk: number, def: number): number {
    const base = atk * 4 - def * 2;
    const variance = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(base * variance));
  }

  private applySkillEffect(
    skillId: number,
    casterAtk: number,
    casterMat: number,
    target: GameEnemy | GameActor
  ): EffectResult {
    const skill = DataManager.skill(skillId);
    if (skill.type === "heal") {
      const amount = -skill.power;
      target.gainHp(amount);
      this.log.push(`${target.name} recovers ${amount} HP.`);
      if (skill.removeState) {
        for (const s of [...target.states]) {
          const data = DataManager.state(s.stateId);
          target.removeState(s.stateId);
          this.log.push(`${target.name} is cured of ${data.name}.`);
        }
      }
      return { target, amount, isHeal: true };
    }
    const atkStat = skill.type === "magical" ? casterMat : casterAtk;
    const defStat = skill.type === "magical" ? target.mdf : target.def;
    let dmg = Math.max(1, Math.round(this.physicalDamage(atkStat, defStat) * (skill.power / 14)));
    if (this.defending.has(target)) dmg = Math.round(dmg * 0.5);
    target.gainHp(-dmg);
    this.log.push(`${target.name} takes ${dmg} damage from ${skill.name}.`);
    if (skill.stateId && Math.random() < (skill.hitRate ?? 1)) {
      target.addState(skill.stateId);
      this.log.push(`${target.name} is afflicted by ${DataManager.state(skill.stateId).name}!`);
    }
    return { target, amount: dmg, isHeal: false };
  }

  executePlayerAction(action: BattleAction): EffectResult | null {
    if (action.kind === "attack") {
      let dmg = this.physicalDamage(action.actor.atk, action.target.def);
      if (this.defending.has(action.target)) dmg = Math.round(dmg * 0.5);
      action.target.gainHp(-dmg);
      this.log.push(`${action.actor.name} attacks ${action.target.name} for ${dmg} damage.`);
      return { target: action.target, amount: dmg, isHeal: false };
    } else if (action.kind === "skill") {
      const skill = DataManager.skill(action.skillId);
      if (action.actor.mp < skill.mpCost) {
        this.log.push(`${action.actor.name} doesn't have enough MP!`);
        return null;
      }
      action.actor.gainMp(-skill.mpCost);
      this.log.push(`${action.actor.name} uses ${skill.name}!`);
      return this.applySkillEffect(action.skillId, action.actor.atk, action.actor.mat, action.target);
    } else if (action.kind === "item") {
      const item = DataManager.item(action.itemId);
      if (!GameParty.consumeItem(action.itemId)) {
        this.log.push(`No more ${item.name} left!`);
        return null;
      }
      action.target.gainHp(item.hpRecover);
      action.target.gainMp(item.mpRecover);
      if (item.removeState) action.target.removeState(item.removeState);
      this.log.push(`${action.actor.name} uses ${item.name} on ${action.target.name}.`);
      return item.hpRecover > 0 ? { target: action.target, amount: item.hpRecover, isHeal: true } : null;
    } else if (action.kind === "defend") {
      this.defending.add(action.actor);
      this.log.push(`${action.actor.name} braces for impact.`);
    }
    return null;
  }

  /** Resolves a single enemy's turn. Returns the primary effect for popup/shake purposes. */
  runSingleEnemyAction(enemy: GameEnemy): EffectResult | null {
    if (enemy.isParalyzed()) {
      this.log.push(`${enemy.name} is paralyzed and cannot move!`);
      return null;
    }
    const targets = GameParty.aliveMembers();
    if (targets.length === 0) return null;
    const target = targets[Math.floor(Math.random() * targets.length)];

    const useSkill = enemy.skillIds.length > 0 && Math.random() < 0.45;
    if (useSkill) {
      const skillId = enemy.skillIds[Math.floor(Math.random() * enemy.skillIds.length)];
      this.log.push(`${enemy.name} uses ${DataManager.skill(skillId).name}!`);
      return this.applySkillEffect(skillId, enemy.atk, enemy.mat, target);
    }
    let dmg = this.physicalDamage(enemy.atk, target.def);
    if (this.defending.has(target)) dmg = Math.round(dmg * 0.5);
    target.gainHp(-dmg);
    this.log.push(`${enemy.name} attacks ${target.name} for ${dmg} damage.`);
    return { target, amount: dmg, isHeal: false };
  }

  /** Ticks poison/etc for both sides at the end of a full round. */
  tickAllStates() {
    for (const m of GameParty.members) this.log.push(...m.tickStates());
    for (const e of this.enemies) this.log.push(...e.tickStates());
  }

  /** Chance to flee scales with the party's average AGI vs the enemies' average AGI. */
  attemptEscape(): boolean {
    const partyAgi = GameParty.aliveMembers().reduce((s, m) => s + m.agi, 0) / Math.max(1, GameParty.aliveMembers().length);
    const enemyAgi = this.aliveEnemies().reduce((s, e) => s + e.agi, 0) / Math.max(1, this.aliveEnemies().length);
    const chance = Math.min(0.9, Math.max(0.15, 0.5 + (partyAgi - enemyAgi) / 100));
    const success = Math.random() < chance;
    this.log.push(success ? "The party flees from battle!" : "Couldn't escape!");
    return success;
  }

  checkResult(): BattleResult {
    if (this.aliveEnemies().length === 0) return "victory";
    if (GameParty.isAllDead()) return "defeat";
    return "ongoing";
  }

  rewards() {
    const exp = this.enemies.reduce((sum, e) => sum + e.exp, 0);
    const gold = this.enemies.reduce((sum, e) => sum + e.gold, 0);
    return { exp, gold };
  }
}

export const BattleManager = new BattleManagerImpl();

