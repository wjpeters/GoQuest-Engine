import type { EditorState } from "../state/EditorState";

export type CommandSource = "toolbar" | "hierarchy" | "inspector" | "flow" | "quest" | "json" | "ai" | "system";

export type CommandMetadataValue = string | number | boolean;

export interface CommandMetadata {
  source?: CommandSource;
  [key: string]: CommandMetadataValue | undefined;
}

export interface CommandMergeContext {
  elapsedMs: number;
}

export interface EditorCommand {
  id: string;
  label: string;
  metadata?: CommandMetadata;
  execute(state: EditorState): EditorState;
  undo(state: EditorState): EditorState;
  canMergeWith?(next: EditorCommand, context: CommandMergeContext): boolean;
  mergeWith?(next: EditorCommand): EditorCommand;
}

export function createCommandId(prefix: string) {
  const randomValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}:${randomValue}`;
}
