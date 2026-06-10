import { Scene } from "./Scene";
import type { WorldSpec } from "../quest/WorldSpec";

export class SceneSerializer {
  static fromWorldSpec(world: WorldSpec) {
    return new Scene(world.entities);
  }

  static toWorldSpec(scene: Scene, world: WorldSpec): WorldSpec {
    return {
      ...world,
      entities: scene.all().map((entity) => entity.spec),
    };
  }
}
