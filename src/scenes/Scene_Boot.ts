import type { Scene } from "../core/SceneManager";
import { SceneManager } from "../core/SceneManager";
import { Scene_Title } from "./Scene_Title";

// Scene_Boot: mirrors RPG Maker MV's Scene_Boot, the brief entry point
// that hands control to the title screen once data is ready. Since our
// data is bundled statically there is no async load step needed.
export class Scene_Boot implements Scene {
  start() {
    SceneManager.goto(() => new Scene_Title());
  }
  update() {}
  draw() {}
}
