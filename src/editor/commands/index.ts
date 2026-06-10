export type {
  CommandMergeContext,
  CommandMetadata,
  CommandMetadataValue,
  CommandSource,
  EditorCommand,
} from "./EditorCommand";
export { CommandManager, type CommandHistoryEntry, type CommandManagerSnapshot } from "./CommandManager";
export {
  deepCloneSpec,
  ensureUniqueId,
  removeEntityById,
  removeInteractionById,
  updateEntityById,
  updateInteractionById,
  withSyncedInteractionRefs,
} from "./utils";
export {
  AddEntityCommand,
  ChangeMaterialCommand,
  DeleteEntityCommand,
  DuplicateEntityCommand,
  UpdateEntityCommand,
  UpdateTransformCommand,
} from "./entityCommands";
export { AddInteractionCommand, DeleteInteractionCommand, UpdateInteractionCommand } from "./interactionCommands";
export { BatchCommand, ReplaceWorldSpecCommand, UpdateQuestStateCommand, UpdateWorldMetadataCommand } from "./worldCommands";
