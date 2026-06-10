import { Vec3 } from "./Vec3";

export type Mat4Array = Float32Array;

export class Mat4 {
  static identity(): Mat4Array {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  static multiply(a: Mat4Array, b: Mat4Array): Mat4Array {
    const out = new Float32Array(16);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b[col * 4 + 0] +
          a[1 * 4 + row] * b[col * 4 + 1] +
          a[2 * 4 + row] * b[col * 4 + 2] +
          a[3 * 4 + row] * b[col * 4 + 3];
      }
    }
    return out;
  }

  static perspective(fovRadians: number, aspect: number, near: number, far: number): Mat4Array {
    const f = 1 / Math.tan(fovRadians / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) * nf,
      -1,
      0,
      0,
      2 * far * near * nf,
      0,
    ]);
  }

  static lookAt(eye: Vec3, target: Vec3, up = new Vec3(0, 1, 0)): Mat4Array {
    const z = Vec3.subtract(eye, target).normalize();
    const x = Vec3.cross(up, z).normalize();
    const y = Vec3.cross(z, x).normalize();

    return new Float32Array([
      x.x,
      y.x,
      z.x,
      0,
      x.y,
      y.y,
      z.y,
      0,
      x.z,
      y.z,
      z.z,
      0,
      -Vec3.dot(x, eye),
      -Vec3.dot(y, eye),
      -Vec3.dot(z, eye),
      1,
    ]);
  }

  static translate(matrix: Mat4Array, value: Vec3): Mat4Array {
    const out = new Float32Array(matrix);
    out[12] = matrix[0] * value.x + matrix[4] * value.y + matrix[8] * value.z + matrix[12];
    out[13] = matrix[1] * value.x + matrix[5] * value.y + matrix[9] * value.z + matrix[13];
    out[14] = matrix[2] * value.x + matrix[6] * value.y + matrix[10] * value.z + matrix[14];
    out[15] = matrix[3] * value.x + matrix[7] * value.y + matrix[11] * value.z + matrix[15];
    return out;
  }

  static rotateX(matrix: Mat4Array, radians: number): Mat4Array {
    const s = Math.sin(radians);
    const c = Math.cos(radians);
    return Mat4.multiply(matrix, new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]));
  }

  static rotateY(matrix: Mat4Array, radians: number): Mat4Array {
    const s = Math.sin(radians);
    const c = Math.cos(radians);
    return Mat4.multiply(matrix, new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]));
  }

  static rotateZ(matrix: Mat4Array, radians: number): Mat4Array {
    const s = Math.sin(radians);
    const c = Math.cos(radians);
    return Mat4.multiply(matrix, new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  }

  static scale(matrix: Mat4Array, value: Vec3): Mat4Array {
    return Mat4.multiply(
      matrix,
      new Float32Array([value.x, 0, 0, 0, 0, value.y, 0, 0, 0, 0, value.z, 0, 0, 0, 0, 1]),
    );
  }
}
