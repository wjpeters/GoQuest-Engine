export type Vec3Tuple = [number, number, number];

export class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  static fromTuple(value: Vec3Tuple) {
    return new Vec3(value[0], value[1], value[2]);
  }

  static subtract(a: Vec3, b: Vec3) {
    return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static add(a: Vec3, b: Vec3) {
    return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static scale(value: Vec3, scalar: number) {
    return new Vec3(value.x * scalar, value.y * scalar, value.z * scalar);
  }

  static dot(a: Vec3, b: Vec3) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a: Vec3, b: Vec3) {
    return new Vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x,
    );
  }

  toTuple(): Vec3Tuple {
    return [this.x, this.y, this.z];
  }

  length() {
    return Math.hypot(this.x, this.y, this.z);
  }

  normalize() {
    const length = this.length();
    if (length === 0) {
      return new Vec3(0, 0, 0);
    }
    return new Vec3(this.x / length, this.y / length, this.z / length);
  }
}
