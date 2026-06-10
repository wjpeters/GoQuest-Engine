import type { QuestSpec } from "../../engine/quest/QuestSpec";
import type { WorldSpec } from "../../engine/quest/WorldSpec";
import type { EditorState } from "../state/EditorState";
import type { CommandMetadata, EditorCommand } from "./EditorCommand";
import { createCommandId } from "./EditorCommand";
import { deepCloneSpec } from "./utils";

export type WorldMetadataPatch = Partial<
  Pick<
    WorldSpec,
    | "title"
    | "description"
    | "metadata"
    | "viewport"
    | "environment"
    | "camera"
    | "requiredCapabilities"
    | "preferredRenderer"
    | "allowRendererDegradation"
    | "exportSettings"
  >
>;

export class UpdateWorldMetadataCommand implements EditorCommand {
  readonly id = createCommandId("update-world");
  readonly label = "Update world metadata";
  readonly metadata?: CommandMetadata;
  private beforeWorld?: WorldSpec;

  constructor(private readonly patch: WorldMetadataPatch, metadata?: CommandMetadata) {
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    this.beforeWorld ??= deepCloneSpec(state.world);
    return {
      ...state,
      world: {
        ...state.world,
        ...deepCloneSpec(this.patch),
      },
    };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeWorld) {
      return state;
    }
    return {
      ...state,
      world: deepCloneSpec(this.beforeWorld),
    };
  }
}

export class UpdateQuestStateCommand implements EditorCommand {
  readonly id = createCommandId("update-quest");
  readonly label = "Update quest state";
  readonly metadata?: CommandMetadata;
  private beforeQuest?: QuestSpec;

  constructor(private readonly patch: Partial<QuestSpec>, metadata?: CommandMetadata) {
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    this.beforeQuest ??= deepCloneSpec(state.world.quest);
    return {
      ...state,
      world: {
        ...state.world,
        quest: {
          ...state.world.quest,
          ...deepCloneSpec(this.patch),
        },
      },
    };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeQuest) {
      return state;
    }
    return {
      ...state,
      world: {
        ...state.world,
        quest: deepCloneSpec(this.beforeQuest),
      },
    };
  }
}

export class ReplaceWorldSpecCommand implements EditorCommand {
  readonly id = createCommandId("replace-world");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeState?: EditorState;

  constructor(
    private readonly world: WorldSpec,
    label = "Replace world spec",
    metadata?: CommandMetadata,
  ) {
    this.label = label;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    this.beforeState ??= deepCloneSpec(state);
    const world = deepCloneSpec(this.world);
    return {
      ...state,
      world,
      selectedEntityId: world.entities.find((entity) => entity.selectable)?.id,
      selectedInteractionId: undefined,
    };
  }

  undo(): EditorState {
    if (!this.beforeState) {
      throw new Error("Cannot undo replace before it has executed.");
    }
    return deepCloneSpec(this.beforeState);
  }
}

export class BatchCommand implements EditorCommand {
  readonly id = createCommandId("batch");
  readonly label: string;
  readonly metadata?: CommandMetadata;

  constructor(
    private readonly commands: EditorCommand[],
    label = "Batch edit",
    metadata?: CommandMetadata,
  ) {
    this.label = label;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    return this.commands.reduce((currentState, command) => command.execute(currentState), state);
  }

  undo(state: EditorState): EditorState {
    return [...this.commands].reverse().reduce((currentState, command) => command.undo(currentState), state);
  }
}
