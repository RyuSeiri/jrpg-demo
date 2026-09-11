// SceneManager: owns the single active scene and drives the main loop.
// Mirrors RPG Maker MV's SceneManager, but scenes render to a shared
// Canvas2D context instead of a PIXI stage.
import { Input } from "./Input";

export interface Scene {
  start(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  isBusy?(): boolean;
}

type SceneFactory = () => Scene;

class SceneManagerImpl {
  private current: Scene | null = null;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private lastTime = 0;
  private nextScene: SceneFactory | null = null;
  private fadeAlpha = 0;
  private static readonly FADE_SECONDS = 0.25;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    requestAnimationFrame(this.loop);
  }

  goto(factory: SceneFactory) {
    this.nextScene = factory;
  }

  private loop = (time: number) => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = time;

    if (this.nextScene) {
      this.current = this.nextScene();
      this.nextScene = null;
      this.current.start();
      this.fadeAlpha = 1;
    }

    if (this.current) {
      this.current.update(dt);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.current.draw(this.ctx);
    }

    if (this.fadeAlpha > 0) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt / SceneManagerImpl.FADE_SECONDS);
      this.ctx.save();
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }

    Input.clearFrame();
    requestAnimationFrame(this.loop);
  };
}

export const SceneManager = new SceneManagerImpl();
