import { Entity } from "./Entity";
import type { EntitySpec } from "../quest/WorldSpec";

export class Scene {
  readonly entities = new Map<string, Entity>();

  constructor(entities: EntitySpec[] = []) {
    entities.forEach((entity) => this.addEntity(entity));
  }

  addEntity(spec: EntitySpec) {
    const entity = new Entity(spec);
    this.entities.set(entity.id, entity);
    return entity;
  }

  getEntity(id: string) {
    return this.entities.get(id);
  }

  all() {
    return [...this.entities.values()];
  }
}
