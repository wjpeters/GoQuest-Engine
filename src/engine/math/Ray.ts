import { Vec3 } from "./Vec3";

export class Ray {
  constructor(
    public origin: Vec3,
    public direction: Vec3,
  ) {}
}
