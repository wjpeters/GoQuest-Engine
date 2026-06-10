import { WorldSpecSchema, type WorldSpec } from "../../engine/quest/WorldSpec";

export type EditorMode = "edit" | "preview";

export interface EditorState {
  world: WorldSpec;
  selectedEntityId?: string;
  selectedInteractionId?: string;
  mode: EditorMode;
}

export interface EditorValidationIssue {
  path: string;
  message: string;
}

export interface EditorValidationResult {
  valid: boolean;
  issues: EditorValidationIssue[];
}

export interface CreateEditorStateOptions {
  selectedEntityId?: string;
  selectedInteractionId?: string;
  mode?: EditorMode;
}

export function createEditorState(world: WorldSpec, options: CreateEditorStateOptions = {}): EditorState {
  return normalizeEditorState({
    world,
    selectedEntityId: options.selectedEntityId,
    selectedInteractionId: options.selectedInteractionId,
    mode: options.mode ?? "edit",
  });
}

export function normalizeEditorState(state: EditorState): EditorState {
  const world = WorldSpecSchema.parse(state.world);
  const selectedEntityId = world.entities.some((entity) => entity.id === state.selectedEntityId)
    ? state.selectedEntityId
    : undefined;
  const selectedInteractionId = world.interactions.some((interaction) => interaction.id === state.selectedInteractionId)
    ? state.selectedInteractionId
    : undefined;

  return {
    world,
    selectedEntityId,
    selectedInteractionId,
    mode: state.mode,
  };
}

export function validateEditorState(state: EditorState): EditorValidationResult {
  const parsed = WorldSpecSchema.safeParse(state.world);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const issues: EditorValidationIssue[] = [];
  const world = parsed.data;
  const entityIds = new Set<string>();
  const interactionIds = new Set<string>();
  const stageIds = new Set(world.quest.stages.map((stage) => stage.id));

  for (const entity of world.entities) {
    if (entityIds.has(entity.id)) {
      issues.push({ path: `entities.${entity.id}`, message: "Entity ids must be unique." });
    }
    entityIds.add(entity.id);
  }

  for (const interaction of world.interactions) {
    if (interactionIds.has(interaction.id)) {
      issues.push({ path: `interactions.${interaction.id}`, message: "Interaction ids must be unique." });
    }
    interactionIds.add(interaction.id);

    if (interaction.targetEntityId && !entityIds.has(interaction.targetEntityId)) {
      issues.push({
        path: `interactions.${interaction.id}.targetEntityId`,
        message: `Target entity "${interaction.targetEntityId}" does not exist.`,
      });
    }
  }

  for (const entity of world.entities) {
    for (const interactionId of entity.interactionIds) {
      if (!interactionIds.has(interactionId)) {
        issues.push({
          path: `entities.${entity.id}.interactionIds`,
          message: `Interaction "${interactionId}" does not exist.`,
        });
      }
    }
  }

  if (!stageIds.has(world.quest.currentStage)) {
    issues.push({
      path: "quest.currentStage",
      message: `Current stage "${world.quest.currentStage}" does not exist.`,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
