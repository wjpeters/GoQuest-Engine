import { createViewProjection } from "../render/Camera";
import type { EntitySpec, WorldSpec } from "../quest/WorldSpec";

function project(world: WorldSpec, entity: EntitySpec, width: number, height: number) {
  const vp = createViewProjection(world, width / Math.max(height, 1));
  const [x, y, z] = entity.transform.position;
  const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
  const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  if (cw <= 0.001) {
    return undefined;
  }
  const ndcX = cx / cw;
  const ndcY = cy / cw;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height,
    depth: cw,
    radius: Math.max(18, (Math.max(...entity.transform.scale) * 92) / cw),
  };
}

export function pickEntityAt(world: WorldSpec, x: number, y: number, width: number, height: number) {
  let best: { entity: EntitySpec; depth: number } | undefined;
  for (const entity of world.entities) {
    if (!entity.visible || !entity.selectable) {
      continue;
    }
    const point = project(world, entity, width, height);
    if (!point) {
      continue;
    }
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= point.radius && (!best || point.depth < best.depth)) {
      best = { entity, depth: point.depth };
    }
  }
  return best?.entity;
}
