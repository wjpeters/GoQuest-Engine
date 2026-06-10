import type { InteractionSpec } from "../../engine/quest/WorldSpec";
import type { EditorState } from "../state/EditorState";
import type { CommandMetadata, EditorCommand } from "./EditorCommand";
import { createCommandId } from "./EditorCommand";
import { deepCloneSpec, ensureUniqueId, removeInteractionById, updateInteractionById, withSyncedInteractionRefs } from "./utils";

export class AddInteractionCommand implements EditorCommand {
  readonly id = createCommandId("add-interaction");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private interaction: InteractionSpec;
  private previousSelectedInteractionId?: string;

  constructor(interaction: InteractionSpec, metadata?: CommandMetadata) {
    this.interaction = deepCloneSpec(interaction);
    this.label = `Add ${interaction.id}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    this.previousSelectedInteractionId = state.selectedInteractionId;
    const nextInteraction = deepCloneSpec(this.interaction);
    nextInteraction.id = ensureUniqueId(nextInteraction.id, state.world.interactions.map((interaction) => interaction.id));
    this.interaction = deepCloneSpec(nextInteraction);

    const world = withSyncedInteractionRefs(
      {
        ...state.world,
        interactions: [...state.world.interactions, nextInteraction],
      },
      nextInteraction.id,
    );

    return {
      ...state,
      world,
      selectedInteractionId: nextInteraction.id,
    };
  }

  undo(state: EditorState): EditorState {
    return {
      ...state,
      world: removeInteractionById(state.world, this.interaction.id),
      selectedInteractionId: this.previousSelectedInteractionId,
    };
  }
}

export class UpdateInteractionCommand implements EditorCommand {
  readonly id = createCommandId("update-interaction");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeInteraction?: InteractionSpec;

  constructor(
    private readonly interactionId: string,
    private readonly patch: Partial<InteractionSpec>,
    metadata?: CommandMetadata,
  ) {
    this.label = `Update ${interactionId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    const current = findInteraction(state.world.interactions, this.interactionId);
    this.beforeInteraction ??= deepCloneSpec(current);

    return {
      ...state,
      world: updateInteractionById(state.world, this.interactionId, (interaction) => ({
        ...interaction,
        ...deepCloneSpec(this.patch),
      })),
    };
  }

  undo(state: EditorState): EditorState {
    if (!this.beforeInteraction) {
      return state;
    }

    return {
      ...state,
      world: updateInteractionById(state.world, this.interactionId, () => deepCloneSpec(this.beforeInteraction!)),
    };
  }
}

export class DeleteInteractionCommand implements EditorCommand {
  readonly id = createCommandId("delete-interaction");
  readonly label: string;
  readonly metadata?: CommandMetadata;
  private beforeState?: EditorState;

  constructor(private readonly interactionId: string, metadata?: CommandMetadata) {
    this.label = `Delete ${interactionId}`;
    this.metadata = metadata;
  }

  execute(state: EditorState): EditorState {
    findInteraction(state.world.interactions, this.interactionId);
    this.beforeState ??= deepCloneSpec(state);
    return {
      ...state,
      world: removeInteractionById(state.world, this.interactionId),
      selectedInteractionId: state.selectedInteractionId === this.interactionId ? undefined : state.selectedInteractionId,
    };
  }

  undo(): EditorState {
    if (!this.beforeState) {
      throw new Error("Cannot undo delete before it has executed.");
    }
    return deepCloneSpec(this.beforeState);
  }
}

function findInteraction(interactions: InteractionSpec[], interactionId: string) {
  const interaction = interactions.find((item) => item.id === interactionId);
  if (!interaction) {
    throw new Error(`Interaction "${interactionId}" was not found.`);
  }
  return interaction;
}
