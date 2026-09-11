import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Input } from "../core/Input";
import { GameParty } from "../game/GameParty";
import { GameActor } from "../game/GameActor";
import { GameEnemy } from "../game/GameEnemy";
import { GameSwitches } from "../game/GameSwitches";
import { BattleManager, type EffectResult } from "../game/BattleManager";
import { DataManager } from "../core/DataManager";
import {
  drawBackdrop,
  drawGauge,
  drawHeaderBar,
  drawListHorizontal,
  drawPortrait,
  drawShadow,
  drawText,
  drawWindow,
  Palette,
} from "../ui/Window";
import { Scene_Map } from "./Scene_Map";
import { Scene_Title } from "./Scene_Title";
import { Scene_Ending } from "./Scene_Ending";

type Phase = "command" | "skill" | "item" | "selectEnemyTarget" | "selectAllyTarget" | "result";
type PendingKind = "attack" | "skill" | "item";
type Unit = GameActor | GameEnemy;

const COMMANDS = ["Attack", "Skill", "Item", "Defend", "Run"];
const ENEMY_ACT_DELAY = 0.55;
const ENEMY_ROW_Y = 120;
const LOG_Y = 208;
const LOG_H = 54;
const PARTY_Y = 454;
const PARTY_H = 100;
const CMD_Y = 564;
const CMD_H = 50;

function isActor(u: Unit): u is GameActor {
  return "weaponId" in u;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

// Scene_Battle: mirrors RPG Maker MV's Scene_Battle + Window_BattleLog.
// Turn order is a single AGI-sorted queue mixing actors and enemies (like
// most modern JRPGs), rebuilt at the start of every round.
export class Scene_Battle implements Scene {
  private phase: Phase = "command";
  private commandIndex = 0;
  private subIndex = 0;
  private targetIndex = 0;
  private pendingKind: PendingKind = "attack";
  private pendingSkillId = 0;
  private pendingItemId = 0;
  private resultText = "";
  private enemyIds: number[];
  private bossSwitchKey?: string;

  private queue: Unit[] = [];
  private queueIndex = 0;
  private enemyActDelay = 0;

  private popups: Popup[] = [];
  private shake = 0;
  private flashTarget: Unit | null = null;
  private flashTimer = 0;

  constructor(enemyIds: number[], options?: { bossSwitchKey?: string }) {
    this.enemyIds = enemyIds;
    this.bossSwitchKey = options?.bossSwitchKey;
  }

  start() {
    BattleManager.setup(this.enemyIds);
    this.phase = "command";
    this.commandIndex = 0;
    this.popups = [];
    this.shake = 0;
    this.flashTarget = null;
    this.rebuildQueue();
  }

  private rebuildQueue() {
    const combined: Unit[] = [...GameParty.aliveMembers(), ...BattleManager.aliveEnemies()];
    combined.sort((a, b) => b.agi - a.agi + (Math.random() * 6 - 3));
    this.queue = combined;
    this.queueIndex = 0;
    this.enemyActDelay = 0;
  }

  private currentUnit(): Unit | null {
    return this.queue[this.queueIndex] ?? null;
  }

  private currentActor(): GameActor | null {
    const u = this.currentUnit();
    return u && isActor(u) ? u : null;
  }

  private enemyScreenPos(enemy: GameEnemy, ctxWidth: number): { x: number; y: number } {
    const index = BattleManager.enemies.indexOf(enemy);
    const spacing = ctxWidth / (BattleManager.enemies.length + 1);
    return { x: spacing * (index + 1), y: ENEMY_ROW_Y };
  }

  private actorScreenPos(actor: GameActor): { x: number; y: number } {
    const index = GameParty.members.indexOf(actor);
    return { x: 24 + index * 220 + 50, y: PARTY_Y + 10 };
  }

  private spawnJuice(effect: EffectResult | null, canvasWidth: number) {
    if (!effect) return;
    const pos = isActor(effect.target)
      ? this.actorScreenPos(effect.target)
      : this.enemyScreenPos(effect.target, canvasWidth);
    this.popups.push({
      x: pos.x,
      y: pos.y - 10,
      text: `${effect.isHeal ? "+" : "-"}${Math.abs(effect.amount)}`,
      color: effect.isHeal ? "#7ee787" : "#ff6b6b",
      life: 0.9,
    });
    if (!effect.isHeal) {
      this.shake = 0.18;
      this.flashTarget = effect.target;
      this.flashTimer = 0.12;
    }
  }

  private advanceTurn() {
    this.queueIndex += 1;
    this.commandIndex = 0;
    this.phase = "command";
  }

  update(dt: number) {
    for (const p of this.popups) p.y -= 30 * dt;
    this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashTarget = null;
    }

    const result = BattleManager.checkResult();
    if (this.phase !== "result" && result !== "ongoing") {
      this.phase = "result";
      if (result === "victory") {
        if (this.bossSwitchKey) GameSwitches.set(this.bossSwitchKey, true);
        const { exp, gold } = BattleManager.rewards();
        GameParty.gainGold(gold);
        const levelUps = GameParty.members
          .filter((m) => m.isAlive)
          .map((m) => ({ name: m.name, levels: m.gainExp(exp) }))
          .filter((r) => r.levels > 0);
        this.resultText = `Victory! Gained ${exp} EXP and ${gold} gold.`;
        if (levelUps.length > 0) {
          this.resultText += " " + levelUps.map((r) => `${r.name} reached a new level!`).join(" ");
        }
      } else {
        this.resultText = "The party has fallen...";
      }
      return;
    }

    if (this.phase === "result") {
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        if (result === "victory") {
          if (this.bossSwitchKey) SceneManager.goto(() => new Scene_Ending());
          else SceneManager.goto(() => new Scene_Map());
        } else {
          GameParty.healAllFully();
          SceneManager.goto(() => new Scene_Title());
        }
      }
      return;
    }

    // skip past units that died since the queue was built
    while (this.queueIndex < this.queue.length && !this.queue[this.queueIndex].isAlive) {
      this.queueIndex += 1;
    }
    if (this.queueIndex >= this.queue.length) {
      BattleManager.tickAllStates();
      this.rebuildQueue();
      return;
    }

    const unit = this.queue[this.queueIndex];

    if (!isActor(unit)) {
      if (this.enemyActDelay > 0) {
        this.enemyActDelay -= dt;
        return;
      }
      BattleManager.clearDefend(unit);
      const effect = BattleManager.runSingleEnemyAction(unit);
      this.spawnJuice(effect, 816);
      this.queueIndex += 1;
      this.enemyActDelay = ENEMY_ACT_DELAY;
      return;
    }

    const actor = unit;
    if (actor.isParalyzed()) {
      BattleManager.log.push(`${actor.name} is paralyzed and cannot move!`);
      this.advanceTurn();
      return;
    }

    if (this.phase === "command") {
      BattleManager.clearDefend(actor);
      if (Input.isTriggered("ArrowUp")) this.commandIndex = (this.commandIndex - 1 + COMMANDS.length) % COMMANDS.length;
      if (Input.isTriggered("ArrowDown")) this.commandIndex = (this.commandIndex + 1) % COMMANDS.length;
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const cmd = COMMANDS[this.commandIndex];
        if (cmd === "Attack") {
          this.pendingKind = "attack";
          this.phase = "selectEnemyTarget";
          this.targetIndex = 0;
        } else if (cmd === "Skill" && actor.skills().length > 0) {
          this.phase = "skill";
          this.subIndex = 0;
        } else if (cmd === "Item" && GameParty.usableItems().length > 0) {
          this.phase = "item";
          this.subIndex = 0;
        } else if (cmd === "Defend") {
          BattleManager.executePlayerAction({ kind: "defend", actor });
          this.advanceTurn();
        } else if (cmd === "Run") {
          const escaped = BattleManager.attemptEscape();
          if (escaped) {
            SceneManager.goto(() => new Scene_Map());
            return;
          }
          this.advanceTurn();
        }
      }
      return;
    }

    if (this.phase === "skill") {
      const skills = actor.skills();
      if (Input.isTriggered("ArrowUp")) this.subIndex = (this.subIndex - 1 + skills.length) % skills.length;
      if (Input.isTriggered("ArrowDown")) this.subIndex = (this.subIndex + 1) % skills.length;
      if (Input.isTriggered("Escape")) this.phase = "command";
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const skill = skills[this.subIndex];
        this.pendingSkillId = skill.id;
        this.pendingKind = "skill";
        this.targetIndex = 0;
        this.phase = skill.type === "heal" ? "selectAllyTarget" : "selectEnemyTarget";
      }
      return;
    }

    if (this.phase === "item") {
      const items = GameParty.usableItems();
      if (Input.isTriggered("ArrowUp")) this.subIndex = (this.subIndex - 1 + items.length) % items.length;
      if (Input.isTriggered("ArrowDown")) this.subIndex = (this.subIndex + 1) % items.length;
      if (Input.isTriggered("Escape")) this.phase = "command";
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        this.pendingItemId = items[this.subIndex].id;
        this.pendingKind = "item";
        this.targetIndex = 0;
        this.phase = "selectAllyTarget";
      }
      return;
    }

    if (this.phase === "selectEnemyTarget") {
      const enemyTargets = BattleManager.aliveEnemies();
      if (Input.isTriggered("ArrowLeft")) this.targetIndex = (this.targetIndex - 1 + enemyTargets.length) % enemyTargets.length;
      if (Input.isTriggered("ArrowRight")) this.targetIndex = (this.targetIndex + 1) % enemyTargets.length;
      if (Input.isTriggered("Escape")) this.phase = "command";
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const target = enemyTargets[this.targetIndex];
        const effect =
          this.pendingKind === "attack"
            ? BattleManager.executePlayerAction({ kind: "attack", actor, target })
            : BattleManager.executePlayerAction({ kind: "skill", actor, skillId: this.pendingSkillId, target });
        this.spawnJuice(effect, 816);
        this.advanceTurn();
      }
      return;
    }

    if (this.phase === "selectAllyTarget") {
      const allyTargets = GameParty.aliveMembers();
      if (Input.isTriggered("ArrowLeft")) this.targetIndex = (this.targetIndex - 1 + allyTargets.length) % allyTargets.length;
      if (Input.isTriggered("ArrowRight")) this.targetIndex = (this.targetIndex + 1) % allyTargets.length;
      if (Input.isTriggered("Escape")) this.phase = "command";
      if (Input.isTriggered("Enter") || Input.isTriggered(" ")) {
        const target = allyTargets[this.targetIndex];
        const effect =
          this.pendingKind === "item"
            ? BattleManager.executePlayerAction({ kind: "item", actor, itemId: this.pendingItemId, target })
            : BattleManager.executePlayerAction({ kind: "skill", actor, skillId: this.pendingSkillId, target });
        this.spawnJuice(effect, 816);
        this.advanceTurn();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shake > 0) {
      const mag = this.shake * 16;
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    drawBackdrop(ctx, "#2c1e42", "#120c1c");

    const turnUnit = this.currentUnit();
    const turnLabel = this.phase === "result" ? "" : turnUnit ? `${turnUnit.name}'s turn` : "";
    drawHeaderBar(ctx, "Battle", turnLabel);

    const enemies = BattleManager.enemies;
    const spacing = ctx.canvas.width / (enemies.length + 1);
    enemies.forEach((enemy, i) => {
      const cx = spacing * (i + 1);
      const cy = ENEMY_ROW_Y;
      const alive = enemy.isAlive;
      ctx.globalAlpha = alive ? 1 : 0.25;
      drawShadow(ctx, cx, cy + 40, 36);
      const flashing = this.flashTarget === enemy && this.flashTimer > 0;
      const grad = ctx.createRadialGradient(cx - 10, cy - 12, 6, cx, cy, 34);
      if (flashing) {
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#ffffff");
      } else {
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.25, enemy.color);
        grad.addColorStop(1, enemy.color);
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const selected = this.phase === "selectEnemyTarget" && BattleManager.aliveEnemies()[this.targetIndex] === enemy;
      if (selected) {
        drawText(ctx, "▼", cx, cy - 62, Palette.accent, "18px sans-serif", "center");
      }
      if (BattleManager.isDefending(enemy)) {
        drawText(ctx, "🛡", cx, cy - 44, Palette.textDim, "14px sans-serif", "center");
      }
      drawText(ctx, (selected ? "> " : "") + enemy.name, cx, cy + 46, selected ? Palette.accent : Palette.text, "13px sans-serif", "center");
      drawGauge(ctx, cx - 40, cy + 64, 80, 8, enemy.hp / enemy.maxHp, Palette.danger);
      if (enemy.states.length > 0) {
        const icons = enemy.states.map((s) => DataManager.state(s.stateId).icon).join(" ");
        drawText(ctx, icons, cx, cy + 76, Palette.accent, "14px sans-serif", "center");
      }
    });

    const log = BattleManager.log.slice(-3);
    drawWindow(ctx, 10, LOG_Y, ctx.canvas.width - 20, LOG_H);
    log.forEach((line, i) => drawText(ctx, line, 20, LOG_Y + 8 + i * 17, "#dfe3ee", "13px sans-serif"));

    drawWindow(ctx, 10, PARTY_Y, ctx.canvas.width - 20, PARTY_H);
    GameParty.members.forEach((m, i) => {
      const x = 24 + i * 220;
      const acting = this.currentActor() === m;
      const targeted =
        (this.phase === "selectAllyTarget" && GameParty.aliveMembers()[this.targetIndex] === m) || false;
      const stateIcons = m.states.map((s) => DataManager.state(s.stateId).icon).join(" ");
      const flashing = this.flashTarget === m && this.flashTimer > 0;
      if (flashing) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + 21, PARTY_Y + 8 + 21, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawPortrait(ctx, x, PARTY_Y + 8, 42, m.faceColor, m.name[0]);
      if (BattleManager.isDefending(m)) drawText(ctx, "🛡", x + 34, PARTY_Y - 4, Palette.textDim, "13px sans-serif");
      const label = (acting || targeted ? "> " : "  ") + `${m.name} Lv${m.level} ${stateIcons}`;
      drawText(ctx, label, x + 50, PARTY_Y + 10, acting || targeted ? Palette.accent : Palette.text, "14px sans-serif");
      drawText(ctx, `HP ${m.hp}/${m.maxHp}`, x + 50, PARTY_Y + 32, "#f2f2f2", "12px sans-serif");
      drawGauge(ctx, x + 50, PARTY_Y + 48, 145, 8, m.hp / m.maxHp, Palette.hp);
      drawText(ctx, `MP ${m.mp}/${m.maxMp}`, x + 50, PARTY_Y + 60, "#c8b6ff", "12px sans-serif");
      drawGauge(ctx, x + 50, PARTY_Y + 76, 145, 8, m.maxMp ? m.mp / m.maxMp : 0, Palette.mp);
    });

    drawWindow(ctx, 10, CMD_Y, ctx.canvas.width - 20, CMD_H);

    if (this.phase === "command") {
      drawListHorizontal(
        ctx,
        COMMANDS.map((cmd) => ({ label: cmd })),
        24,
        CMD_Y + 14,
        this.commandIndex,
        100
      );
    } else if (this.phase === "skill" && this.currentActor()) {
      drawListHorizontal(
        ctx,
        this.currentActor()!.skills().map((s) => ({ label: `${s.name} (MP${s.mpCost})` })),
        24,
        CMD_Y + 14,
        this.subIndex,
        180
      );
    } else if (this.phase === "item") {
      drawListHorizontal(
        ctx,
        GameParty.usableItems().map((it) => ({ label: `${it.name} x${it.count}` })),
        24,
        CMD_Y + 14,
        this.subIndex,
        180
      );
    } else if (this.phase === "selectEnemyTarget") {
      drawText(ctx, "Left/Right choose enemy target, Enter confirm, Esc cancel", 24, CMD_Y + 16, Palette.text, "14px sans-serif");
    } else if (this.phase === "selectAllyTarget") {
      drawText(ctx, "Left/Right choose ally target, Enter confirm, Esc cancel", 24, CMD_Y + 16, Palette.text, "14px sans-serif");
    } else if (this.phase === "result") {
      drawText(ctx, this.resultText + "  (Press Enter)", 24, CMD_Y + 16, Palette.accent, "16px sans-serif");
    }

    for (const p of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.4));
      drawText(ctx, p.text, p.x, p.y, p.color, "bold 18px sans-serif", "center");
      ctx.restore();
    }

    ctx.restore();
  }
}

