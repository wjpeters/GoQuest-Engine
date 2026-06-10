import { Ray } from "./Ray";
import { Vec3 } from "./Vec3";

export class Bounds {
  constructor(
    public center: Vec3,
    public radius: number,
  ) {}

  intersectsRay(ray: Ray): number | undefined {
    const oc = Vec3.subtract(ray.origin, this.center);
    const a = Vec3.dot(ray.direction, ray.direction);
    const b = 2 * Vec3.dot(oc, ray.direction);
    const c = Vec3.dot(oc, oc) - this.radius * this.radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return undefined;
    }
    return (-b - Math.sqrt(discriminant)) / (2 * a);
  }
}
