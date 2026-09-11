# JRPG Demo Engine

A small, original, data-driven JRPG core built in TypeScript + Canvas2D,
inspired by the **architecture** of `OVER Devil Legend of the sacred stone`
(an RPG Maker MV + NW.js game) analyzed elsewhere in this workspace — no
assets, story, plugins, or code from that project are reused here.

## Why this shape

The original project's own `PROJECT_ANALYSIS.md` describes its stack as:

```
Scene (Scene_Title/Scene_Map/Scene_Battle/Scene_Menu)
  -> Game Objects ($gameParty, $gameMap, $gameActors, $gameTroop)
  -> Managers (BattleManager, SceneManager, ImageManager, AudioManager)
  -> Sprites/Windows (view layer)
  -> Plugins (YEP_*/MOG_*, controller layer)
```

This project reproduces that same layering with plain TypeScript modules
instead of RPG Maker's global `$`-prefixed variables and a plugin
patch-loader — same shape, cleaner boundaries:

| Original (RPG Maker MV)      | This project                          |
|-------------------------------|----------------------------------------|
| `SceneManager` + PIXI stage   | [src/core/SceneManager.ts](src/core/SceneManager.ts) driving a Canvas2D loop |
| `$dataActors`, `$dataEnemies` | [src/core/DataManager.ts](src/core/DataManager.ts) + `src/data/*.json` |
| `$gameParty`                  | [src/game/GameParty.ts](src/game/GameParty.ts) |
| `$gameMap` / `$gamePlayer`    | [src/game/GameMap.ts](src/game/GameMap.ts) |
| `$gameSwitches`               | [src/game/GameSwitches.ts](src/game/GameSwitches.ts) |
| `Game_Actor` / `Game_Enemy`   | [src/game/GameActor.ts](src/game/GameActor.ts), [src/game/GameEnemy.ts](src/game/GameEnemy.ts) |
| `BattleManager`               | [src/game/BattleManager.ts](src/game/BattleManager.ts) |
| `Scene_Boot/Title/Map/Battle/Menu` | [src/scenes/](src/scenes) |
| `Window_Base` drawing helpers | [src/ui/Window.ts](src/ui/Window.ts) |

Unlike the original, there are no global variables, no runtime plugin
patching, and data/view/logic are kept in separate modules — addressing
the coupling issues called out in the analysis doc.

## Features implemented

- **Story with a real payoff**: an original "Sable Blight" premise
  ([src/data/story.json](src/data/story.json)), a typewriter-style prologue,
  NPC dialogue that seeds a quest hook (a corrupted shrine in Whisperwind
  Field), a climactic boss fight, and a typewriter epilogue
  ([Scene_Ending.ts](src/scenes/Scene_Ending.ts)) — this is no longer an
  endless loop with no ending.
- **AGI-driven turn order**: battles use a single turn queue mixing party
  members and enemies sorted by AGI (with slight randomness) each round,
  instead of "all actors act, then all enemies act."
- **Combat juice**: floating damage/heal numbers, a hit-flash on the
  target, and a light screen shake on every hit.
- **Smarter, safer targeting**: heal skills and items now prompt you to
  pick *which ally* to target instead of always hitting yourself — a
  real bug in the previous version that made healing nearly useless in
  a 3-person party.
- **Run/escape command**: flee odds scale with the party's average AGI
  vs. the enemies'.
- **Mixed encounter groups**: random battles can now pull a second,
  different enemy type into the group instead of always cloning one.
- **Out-of-battle healing**: the menu has an Items command for using
  potions/antidotes outside of battle, and save points now fully rest
  the party (not just save).
- **Visual polish**: a shared gold-trimmed gradient windowskin, HP/MP
  gauges with gradient fill, portrait avatars (colored, initial-letter
  placeholders standing in for face graphics), drop shadows under
  sprites, gradient sky backdrops, a title-screen starfield, and a
  fade transition between every scene change.
- Title screen with New Game / Continue (loads a localStorage save).
- Two connected maps (field + town) with tile-based movement, NPC dialogue,
  a shop building, a save point, a map-to-map warp gate, and a hidden
  boss altar tucked inside the field's maze.
- Leveling & equipment: each actor levels up from battle EXP, and can
  equip weapons/armors bought from the shop (Scene_Equip).
- Shop scene: buy/sell items, weapons, and armors for gold.
- Status scene: full stat breakdown, equipped gear, profile, and skill list.
- Save/Load via `localStorage` (party levels/equipment/inventory, map,
  and player position).
- Fully data-driven: actors, enemies, skills, items, weapons, armors,
  states, shops, story text, and maps are plain JSON under `src/data/`.


## Why it doesn't look/read like the analyzed RPG Maker MV project

There are no licensed assets, character art, music, or story text from
`OVER Devil Legend of the sacred stone` (or any other game) in this repo —
only the architecture pattern was reused, as noted in the original README.
Since there's no sprite/tileset art to draw from, everything here is
rendered procedurally with Canvas2D (gradients, shapes, generated
starfields, initial-letter portraits) rather than pre-made graphics, and
the story is an original placeholder plot meant to demonstrate the
dialogue/quest-hook system rather than reproduce someone else's narrative.

## Run it

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build
```

## Controls

- Arrow keys / WASD — move / navigate menus
- Enter / Space — confirm / interact with NPCs, shops, save points
- Escape — open menu (on map) / cancel (in sub-menus) / back


