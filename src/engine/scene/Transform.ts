import { Mat4 } from "../math/Mat4";
import { Vec3 } from "../math/Vec3";
import type { EntitySpec } from "../quest/WorldSpec";

export class Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;

  constructor(spec?: EntitySpec["transform"]) {
    this.position = Vec3.fromTuple(spec?.position ?? [0, 0, 0]);
    this.rotation = Vec3.fromTuple(spec?.rotation ?? [0, 0, 0]);
    this.scale = Vec3.fromTuple(spec?.scale ?? [1, 1, 1]);
  }

  toMatrix() {
    let matrix = Mat4.identity();
    matrix = Mat4.translate(matrix, this.position);
    matrix = Mat4.rotateX(matrix, (this.rotation.x * Math.PI) / 180);
    matrix = Mat4.rotateY(matrix, (this.rotation.y * Math.PI) / 180);
    matrix = Mat4.rotateZ(matrix, (this.rotation.z * Math.PI) / 180);
    matrix = Mat4.scale(matrix, this.scale);
    return matrix;
  }
}
