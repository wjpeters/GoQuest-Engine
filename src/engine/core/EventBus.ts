type Listener<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on<T = unknown>(event: string, listener: Listener<T>) {
    const bucket = this.listeners.get(event) ?? new Set<Listener>();
    bucket.add(listener as Listener);
    this.listeners.set(event, bucket);
    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listener: Listener<T>) {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  emit<T = unknown>(event: string, payload: T) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}
