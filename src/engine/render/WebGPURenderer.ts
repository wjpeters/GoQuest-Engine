import type { Renderer } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { WorldSpec } from "../quest/WorldSpec";

export class WebGPURenderer implements Renderer {
  readonly mode = "webgpu" as const;

  resize() {
    // Reserved for the production renderer path. The MVP ships WebGL2 first.
  }

  render(_scene: Scene, _world: WorldSpec) {
    throw new Error("WebGPU renderer is a roadmap stub in this MVP.");
  }

  dispose() {
    // No resources until the WebGPU backend is implemented.
  }
}
