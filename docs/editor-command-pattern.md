# Editor Command Pattern

The editor routes authoring mutations through `CommandManager` and `EditorCommand` implementations in `src/editor/commands`.
Runtime preview events may update transient world state, but they do not enter the undo/redo history.

## Editor State

`EditorState` lives in `src/editor/state/EditorState.ts` and contains:

- `world`: the active `WorldSpec`.
- `selectedEntityId`: current hierarchy/viewport selection.
- `selectedInteractionId`: current quest-flow selection.
- `mode`: `edit` or `preview`.

Every command result is normalized and validated before it becomes active. Validation includes the `WorldSpec` schema plus editor-level invariants:

- entity ids are unique.
- interaction ids are unique.
- interaction targets point at existing entities.
- entity `interactionIds` point at existing interactions.
- `quest.currentStage` points at an existing stage.

Invalid command output is rejected and the previous state remains active.

## Commands

Commands implement:

```ts
interface EditorCommand {
  id: string;
  label: string;
  metadata?: CommandMetadata;
  execute(state: EditorState): EditorState;
  undo(state: EditorState): EditorState;
}
```

Implemented commands cover:

- entities: add, update, transform, material, delete, duplicate.
- interactions: add, update, delete.
- quest/world: update quest state, update metadata, replace world spec, batch edits.

Commands use immutable helpers from `src/editor/commands/utils.ts`, including `updateEntityById`, `removeEntityById`, `updateInteractionById`, `ensureUniqueId`, and `deepCloneSpec`.

## History

`CommandManager` owns undo and redo stacks. It exposes a snapshot for React UI state, including:

- `canUndo` and `canRedo`.
- latest undo/redo labels.
- `history`, used by the compact history panel.
- validation status.

`UpdateTransformCommand` merges repeated edits for the same entity within 500ms. This keeps drag/number-step style updates as one undoable action.

Template loading clears history and marks the loaded template as the new clean baseline. JSON and AI world replacements use `ReplaceWorldSpecCommand` so they can be undone.

## UI Integration

Authoring paths connected to commands:

- scene hierarchy add, delete, duplicate, and visibility.
- inspector transform, material, visibility, selectability, type, name, and label.
- quest flow add/update/delete interaction controls.
- quest state score and current-stage controls.
- JSON apply.
- AI spec generation.

Keyboard shortcuts are handled at the shell level:

- `Cmd/Ctrl+Z`: undo.
- `Cmd/Ctrl+Shift+Z`: redo.
- `Ctrl+Y`: redo.

The shortcut handler ignores inputs, textareas, selects, and contenteditable elements so native text editing behavior keeps priority.
