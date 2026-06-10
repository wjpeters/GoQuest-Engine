import { Tween } from "./Tween";

export class Timeline {
  private tweens: Tween[] = [];

  add(tween: Tween) {
    this.tweens.push(tween);
  }

  tick(delta: number) {
    this.tweens = this.tweens.filter((tween) => !tween.tick(delta));
  }
}
