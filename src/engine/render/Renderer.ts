import type { Scene } from "../scene/Scene";
import type { WorldSpec } from "../quest/WorldSpec";

export interface Renderer {
  readonly mode: "webgl2" | "webgpu" | "canvas2d";
  resize(width: number, height: number): void;
  render(scene: Scene, world: WorldSpec): void;
  dispose(): void;
}
