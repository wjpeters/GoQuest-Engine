import type { Component } from "./Components";
import { Transform } from "./Transform";
import type { EntitySpec } from "../quest/WorldSpec";

export class Entity {
  readonly id: string;
  spec: EntitySpec;
  transform: Transform;
  components: Component[];

  constructor(spec: EntitySpec) {
    this.id = spec.id;
    this.spec = spec;
    this.transform = new Transform(spec.transform);
    this.components = [
      { kind: "render", entity: spec },
      { kind: "interaction", interactionIds: spec.interactionIds },
    ];
  }
}
