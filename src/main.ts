import "./style.css";
import { SceneManager } from "./core/SceneManager";
import { Input } from "./core/Input";
import { Scene_Boot } from "./scenes/Scene_Boot";

const app = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.createElement("canvas");
canvas.width = 816;
canvas.height = 624;
app.appendChild(canvas);

Input.init();
SceneManager.init(canvas);
SceneManager.goto(() => new Scene_Boot());
