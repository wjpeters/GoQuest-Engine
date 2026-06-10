export type Vec2Tuple = [number, number];

export class Vec2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  static fromTuple(value: Vec2Tuple) {
    return new Vec2(value[0], value[1]);
  }

  toTuple(): Vec2Tuple {
    return [this.x, this.y];
  }

  length() {
    return Math.hypot(this.x, this.y);
  }
}
