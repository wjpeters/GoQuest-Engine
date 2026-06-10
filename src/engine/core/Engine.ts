import { Clock } from "./Clock";
import { EventBus } from "./EventBus";
import type { Renderer } from "../render/Renderer";
import type { WorldSpec } from "../quest/WorldSpec";
import { SceneSerializer } from "../scene/SceneSerializer";

export class Engine {
  readonly clock = new Clock();
  readonly events = new EventBus();
  private running = false;
  private frame = 0;

  constructor(
    private renderer: Renderer,
    private world: WorldSpec,
  ) {}

  setWorld(world: WorldSpec) {
    this.world = world;
  }

  renderFrame() {
    this.clock.tick();
    this.renderer.render(SceneSerializer.fromWorldSpec(this.world), this.world);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    const loop = () => {
      if (!this.running) {
        return;
      }
      this.renderFrame();
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }
}
