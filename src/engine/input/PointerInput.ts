export interface PointerState {
  x: number;
  y: number;
  isDown: boolean;
}

export class PointerInput {
  state: PointerState = { x: 0, y: 0, isDown: false };
  private cleanups: Array<() => void> = [];

  constructor(private target: HTMLElement) {
    this.bind();
  }

  dispose() {
    this.cleanups.forEach((cleanup) => cleanup());
  }

  private bind() {
    const move = (event: PointerEvent) => {
      const rect = this.target.getBoundingClientRect();
      this.state.x = event.clientX - rect.left;
      this.state.y = event.clientY - rect.top;
    };
    const down = () => {
      this.state.isDown = true;
    };
    const up = () => {
      this.state.isDown = false;
    };
    this.target.addEventListener("pointermove", move);
    this.target.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    this.cleanups = [
      () => this.target.removeEventListener("pointermove", move),
      () => this.target.removeEventListener("pointerdown", down),
      () => window.removeEventListener("pointerup", up),
    ];
  }
}
