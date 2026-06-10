export class Clock {
  private lastTime = performance.now();
  elapsed = 0;
  delta = 0;

  tick(now = performance.now()) {
    this.delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.elapsed += this.delta;
    this.lastTime = now;
    return this.delta;
  }
}
