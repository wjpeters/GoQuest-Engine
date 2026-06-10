export interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export class TouchInput {
  readonly touches = new Map<number, TouchPoint>();
  private cleanups: Array<() => void> = [];

  constructor(private target: HTMLElement) {
    const update = (event: TouchEvent) => {
      const rect = this.target.getBoundingClientRect();
      this.touches.clear();
      Array.from(event.touches).forEach((touch) => {
        this.touches.set(touch.identifier, {
          id: touch.identifier,
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      });
    };
    const clear = () => this.touches.clear();
    target.addEventListener("touchstart", update, { passive: true });
    target.addEventListener("touchmove", update, { passive: true });
    target.addEventListener("touchend", clear);
    this.cleanups = [
      () => target.removeEventListener("touchstart", update),
      () => target.removeEventListener("touchmove", update),
      () => target.removeEventListener("touchend", clear),
    ];
  }

  dispose() {
    this.cleanups.forEach((cleanup) => cleanup());
  }
}
