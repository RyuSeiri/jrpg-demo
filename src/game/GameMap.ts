import { DataManager } from "../core/DataManager";
import type { MapData, MapEvent } from "../core/types";

export const TILE_WALL = "1";
export const TILE_FLOOR = "0";

// Game_Map + Game_Player rolled into one: holds the active map's tile grid,
// event list, the player's tile position, and the step counter used to
// roll random encounters. Mirrors $gameMap / $gamePlayer from RPG Maker MV.
class GameMapImpl {
  private data!: MapData;
  mapId = 0;
  playerX = 0;
  playerY = 0;
  facingX = 0;
  facingY = 1;
  private stepsSinceEncounter = 0;

  setup(mapId: number, atX?: number, atY?: number) {
    this.data = DataManager.map(mapId);
    this.mapId = mapId;
    this.playerX = atX ?? this.data.startX;
    this.playerY = atY ?? this.data.startY;
    this.stepsSinceEncounter = 0;
  }

  get width() {
    return this.data.width;
  }
  get height() {
    return this.data.height;
  }
  get tileSize() {
    return this.data.tileSize;
  }
  get name() {
    return this.data.name;
  }
  get events(): MapEvent[] {
    return this.data.events;
  }
  get encounterList(): number[] {
    return this.data.encounterList;
  }

  eventAt(x: number, y: number): MapEvent | undefined {
    return this.data.events.find((e) => e.x === x && e.y === y);
  }

  tileAt(x: number, y: number): string {
    if (y < 0 || y >= this.data.layout.length) return TILE_WALL;
    const row = this.data.layout[y];
    if (x < 0 || x >= row.length) return TILE_WALL;
    return row[x];
  }

  isPassable(x: number, y: number): boolean {
    if (this.tileAt(x, y) !== TILE_FLOOR) return false;
    const event = this.eventAt(x, y);
    if (event && (event.kind === "npc" || event.kind === "shop" || event.kind === "boss")) return false;
    return true;
  }

  /** Attempts to move the player by (dx, dy). Returns true if the tile changed. */
  tryMove(dx: number, dy: number): boolean {
    this.facingX = dx;
    this.facingY = dy;
    const nx = this.playerX + dx;
    const ny = this.playerY + dy;
    if (!this.isPassable(nx, ny)) return false;
    this.playerX = nx;
    this.playerY = ny;
    this.stepsSinceEncounter += 1;
    return true;
  }

  /** The event tile the player is currently standing on, if any (auto-triggered). */
  eventUnderPlayer(): MapEvent | undefined {
    return this.eventAt(this.playerX, this.playerY);
  }

  /** The interactable event tile the player is facing (triggered by confirm key). */
  eventInFront(): MapEvent | undefined {
    return this.eventAt(this.playerX + this.facingX, this.playerY + this.facingY);
  }

  /** Rolls whether a random encounter should trigger on this step. */
  checkEncounter(): number | null {
    if (this.data.encounterList.length === 0) return null;
    if (this.stepsSinceEncounter < this.data.encounterSteps) return null;
    // ~35% chance per step once the minimum step threshold is reached.
    if (Math.random() > 0.35) return null;
    this.stepsSinceEncounter = 0;
    const list = this.data.encounterList;
    return list[Math.floor(Math.random() * list.length)];
  }
}

export const GameMap = new GameMapImpl();

