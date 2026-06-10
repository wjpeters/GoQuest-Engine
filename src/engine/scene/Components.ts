import type { EntitySpec } from "../quest/WorldSpec";

export interface RenderComponent {
  kind: "render";
  entity: EntitySpec;
}

export interface InteractionComponent {
  kind: "interaction";
  interactionIds: string[];
}

export type Component = RenderComponent | InteractionComponent;
