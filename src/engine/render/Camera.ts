import { Mat4 } from "../math/Mat4";
import { Vec3 } from "../math/Vec3";
import type { WorldSpec } from "../quest/WorldSpec";

export function createViewProjection(world: WorldSpec, aspect: number) {
  const camera = world.camera;
  const projection = Mat4.perspective((camera.fov * Math.PI) / 180, aspect, camera.near, camera.far);
  const view = Mat4.lookAt(Vec3.fromTuple(camera.position), Vec3.fromTuple(camera.target));
  return Mat4.multiply(projection, view);
}
