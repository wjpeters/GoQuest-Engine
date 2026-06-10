export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);

export class Tween {
  private elapsed = 0;

  constructor(
    private duration: number,
    private update: (progress: number) => void,
    private easing: Easing = easeOutCubic,
  ) {}

  tick(delta: number) {
    this.elapsed += delta;
    const progress = Math.min(1, this.elapsed / Math.max(this.duration, 0.001));
    this.update(this.easing(progress));
    return progress >= 1;
  }
}
