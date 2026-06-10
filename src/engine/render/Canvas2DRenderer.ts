import type { Renderer } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { WorldSpec } from "../quest/WorldSpec";

export class Canvas2DRenderer implements Renderer {
  readonly mode = "canvas2d" as const;
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas2D is not available in this browser.");
    }
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render(scene: Scene, world: WorldSpec) {
    const { ctx } = this;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    ctx.fillStyle = world.environment.background;
    ctx.fillRect(0, 0, width, height);
    scene.all().forEach((entity) => {
      if (!entity.spec.visible) {
        return;
      }
      const [x, y, z] = entity.spec.transform.position;
      const scale = entity.spec.transform.scale;
      const size = Math.max(12, 42 / (z + 6));
      ctx.globalAlpha = entity.spec.material.opacity;
      ctx.fillStyle = entity.spec.material.emissive ?? entity.spec.material.color;
      ctx.fillRect(width / 2 + x * 56 - size / 2, height / 2 - y * 56 - size / 2, size * scale[0], size * scale[1]);
    });
    ctx.globalAlpha = 1;
  }

  dispose() {
    // Canvas2D has no retained GPU resources.
  }
}
