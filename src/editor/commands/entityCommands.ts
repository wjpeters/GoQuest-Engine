import type { EntitySpec, WorldSpec } from "../../engine/quest/WorldSpec";
import type { EditorState } from "../state/EditorState";
import type { CommandMetadata, CommandMergeContext, EditorCommand } from "./EditorCommand";
import { createCommandId } from "./EditorCommand";
import { deepCloneSpec, ensureUniqueId, removeEntityById, updateEntityById } from "./utils";

type TransformPatch = Partial<EntitySpec["transform"]>;
type MaterialPatch = Partial<EntitySpec["material"]>;

export class AddEntityCommand implements EditorCommand {
  readonly id = createCommandId("add-entity");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private entity: EntitySpec;
  private previousSelectedEntityId?: string;

  constructor(entity: EntitySpec, metadata?: CommandMetadata) {
    this.entity = deepCloneSpec(entity);
    this.label = `Add ${entity.name}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    this.previousSelectedEntityId = state.selectedEntityId;
    const nextEntity = deepCloneSpec(this.entity);
    nextEntity.id = ensureUniqueId(nextEntity.id, state.world.entities.map((entity) => entity.id));
    this.entity = deepCloneSpec(nextEntity);

    return {
      ...state,
      world: {
        ...state.world,
        entities: [...state.world.entities, nextEntity],
      },
      selectedEntityId: nextEntity.id,
      selectedInteractionId: undefined,
    };
  }

  undo(state: EditorState): EditorState {
    return {
      ...state,
      world: {
        ...state.world,
        entities: state.world.entities.filter((entity) => entity.id !== this.entity.id),
      },
      selectedEntityId: this.previousSelectedEntityId,
    };
  }
}

export class UpdateEntityCommand implements EditorCommand {
  readonly id = createCommandId("update-entity");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeEntity?: EntitySpec;

  constructor(
    private readonly entityId: string,
    private readonly patch: Partial<EntitySpec>,
    metadata?: CommandMetadata,
  ) {
    this.label = `Update ${entityId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const current = findEntity(state.world, this.entityId);
    this.beforeEntity ??= deepCloneSpec(current);
    const world = updateEntityById(state.world, this.entityId, (entity) => ({
      ...entity,
      ...deepCloneSpec(this.patch),
    }));
    return { ...state, world };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeEntity) {
      return state;
    }
    return {
      ...state,
      world: updateEntityById(state.world, this.entityId, () => deepCloneSpec(this.beforeEntity!)),
    };
  }
}

export class UpdateTransformCommand implements EditorCommand {
  readonly id = createCommandId("update-transform");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeTransform?: EntitySpec["transform"];

  constructor(
    readonly entityId: string,
    readonly transform: TransformPatch,
    metadata?: CommandMetadata,
  ) {
    this.label = `Move ${entityId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const current = findEntity(state.world, this.entityId);
    this.beforeTransform ??= deepCloneSpec(current.transform);
    const world = updateEntityById(state.world, this.entityId, (entity) => ({
      ...entity,
      transform: {
        ...entity.transform,
        ...deepCloneSpec(this.transform),
      },
    }));
    return { ...state, world };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeTransform) {
      return state;
    }
    return {
      ...state,
      world: updateEntityById(state.world, this.entityId, (entity) => ({
        ...entity,
        transform: deepCloneSpec(this.beforeTransform!),
      })),
    };
  }

  canMergeWith(next: EditorCommand, context: CommandMergeContext): boolean {
    return (
      next instanceof UpdateTransformCommand &&
      next.entityId === this.entityId &&
      context.elapsedMs <= 500
    );
  }

  mergeWith(next: EditorCommand): EditorCommand {
    if (!(next instanceof UpdateTransformCommand)) {
      return this;
    }
    const merged = new UpdateTransformCommand(this.entityId, next.transform, this.metadata);
    merged.beforeTransform = this.beforeTransform;
    return merged;
  }
}

export class ChangeMaterialCommand implements EditorCommand {
  readonly id = createCommandId("change-material");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeMaterial?: EntitySpec["material"];

  constructor(
    private readonly entityId: string,
    private readonly material: MaterialPatch,
    metadata?: CommandMetadata,
  ) {
    this.label = `Change material ${entityId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const current = findEntity(state.world, this.entityId);
    this.beforeMaterial ??= deepCloneSpec(current.material);
    const world = updateEntityById(state.world, this.entityId, (entity) => ({
      ...entity,
      material: {
        ...entity.material,
        ...deepCloneSpec(this.material),
      },
    }));
    return { ...state, world };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeMaterial) {
      return state;
    }
    return {
      ...state,
      world: updateEntityById(state.world, this.entityId, (entity) => ({
        ...entity,
        material: deepCloneSpec(this.beforeMaterial!),
      })),
    };
  }
}

export class DeleteEntityCommand implements EditorCommand {
  readonly id = createCommandId("delete-entity");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeState?: EditorState;

  constructor(private readonly entityId: string, metadata?: CommandMetadata) {
    this.label = `Delete ${entityId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const current = findEntity(state.world, this.entityId);
    this.beforeState ??= deepCloneSpec(state);
    const removal = removeEntityById(state.world, this.entityId);

    return {
      ...state,
      world: removal.world,
      selectedEntityId: state.selectedEntityId === current.id ? undefined : state.selectedEntityId,
      selectedInteractionId: state.selectedInteractionId && removal.interactions.some((interaction) => interaction.id === state.selectedInteractionId)
        ? undefined
        : state.selectedInteractionId,
    };
  }

  undo(): EditorState {
    if (!this.beforeState) {
      throw new Error("Cannot undo delete before it has executed.");
    }
    return deepCloneSpec(this.beforeState);
  }
}

export class DuplicateEntityCommand implements EditorCommand {
  readonly id = createCommandId("duplicate-entity");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private duplicatedEntity?: EntitySpec;
  private previousSelectedEntityId?: string;

  constructor(private readonly entityId: string, metadata?: CommandMetadata) {
    this.label = `Duplicate ${entityId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const source = findEntity(state.world, this.entityId);
    this.previousSelectedEntityId = state.selectedEntityId;
    const duplicate = this.duplicatedEntity ?? createDuplicateEntity(source, state.world);
    this.duplicatedEntity = deepCloneSpec(duplicate);

    return {
      ...state,
      world: {
        ...state.world,
        entities: [...state.world.entities, deepCloneSpec(duplicate)],
      },
      selectedEntityId: duplicate.id,
      selectedInteractionId: undefined,
    };
  }

  undo(state: EditorState): EditorState {
    if (!this.duplicatedEntity) {
      return state;
    }

    return {
      ...state,
      world: {
        ...state.world,
        entities: state.world.entities.filter((entity) => entity.id !== this.duplicatedEntity?.id),
      },
      selectedEntityId: this.previousSelectedEntityId,
    };
  }
}

function findEntity(world: WorldSpec, entityId: string) {
  const entity = world.entities.find((item) => item.id === entityId);
  if (!entity) {
    throw new Error(`Entity "${entityId}" was not found.`);
  }
  return entity;
}

function createDuplicateEntity(entity: EntitySpec, world: WorldSpec): EntitySpec {
  const duplicate = deepCloneSpec(entity);
  duplicate.id = ensureUniqueId(`${entity.id}-copy`, world.entities.map((item) => item.id));
  duplicate.name = ensureUniqueId(`${entity.name} Copy`, world.entities.map((item) => item.name));
  duplicate.transform = {
    ...duplicate.transform,
    position: [
      duplicate.transform.position[0] + 0.35,
      duplicate.transform.position[1] + 0.15,
      duplicate.transform.position[2] + 0.35,
    ],
  };
  duplicate.interactionIds = [];
  return duplicate;
}
