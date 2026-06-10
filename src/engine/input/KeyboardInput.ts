export class KeyboardInput {
  readonly pressed = new Set<string>();
  private cleanups: Array<() => void> = [];

  constructor(target: Window = window) {
    const down = (event: KeyboardEvent) => this.pressed.add(event.key);
    const up = (event: KeyboardEvent) => this.pressed.delete(event.key);
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    this.cleanups = [
      () => target.removeEventListener("keydown", down),
      () => target.removeEventListener("keyup", up),
    ];
  }

  dispose() {
    this.cleanups.forEach((cleanup) => cleanup());
  }
}
