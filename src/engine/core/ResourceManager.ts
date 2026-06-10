export class ResourceManager<T> {
  private resources = new Map<string, T>();

  set(id: string, value: T) {
    this.resources.set(id, value);
  }

  get(id: string) {
    return this.resources.get(id);
  }

  clear() {
    this.resources.clear();
  }
}
