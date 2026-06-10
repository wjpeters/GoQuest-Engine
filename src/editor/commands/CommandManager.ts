import type { EditorState, EditorValidationResult } from "../state/EditorState";
import { normalizeEditorState, validateEditorState } from "../state/EditorState";
import type { EditorCommand } from "./EditorCommand";

export interface CommandHistoryEntry {
  id: string;
  label: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  executedAt: number;
}

export interface CommandManagerSnapshot {
  state: EditorState;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  revision: number;
  history: CommandHistoryEntry[];
  redoHistory: CommandHistoryEntry[];
  validation: EditorValidationResult;
  undoLabel?: string;
  redoLabel?: string;
}

export interface CommandManagerOptions {
  clock?: () => number;
}

interface InternalHistoryEntry {
  command: EditorCommand;
  executedAt: number;
}

export class CommandManager {
  private state: EditorState;
  private readonly clock: () => number;
  private undoStack: InternalHistoryEntry[] = [];
  private redoStack: InternalHistoryEntry[] = [];
  private listeners = new Set<(snapshot: CommandManagerSnapshot) => void>();
  private revision = 0;
  private savedRevision = 0;
  private validation: EditorValidationResult;

  constructor(initialState: EditorState, options: CommandManagerOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.state = this.assertValid(initialState);
    this.validation = validateEditorState(this.state);
  }

  getState() {
    return this.state;
  }

  getSnapshot(): CommandManagerSnapshot {
    return {
      state: this.state,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      dirty: this.revision !== this.savedRevision,
      revision: this.revision,
      history: this.undoStack.map(historyEntry),
      redoHistory: this.redoStack.map(historyEntry),
      validation: this.validation,
      undoLabel: this.undoStack[this.undoStack.length - 1]?.command.label,
      redoLabel: this.redoStack[this.redoStack.length - 1]?.command.label,
    };
  }

  subscribe(listener: (snapshot: CommandManagerSnapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  execute(command: EditorCommand) {
    const previousState = this.state;
    const nextState = this.assertValid(command.execute(previousState));
    const now = this.clock();
    const previousEntry = this.undoStack[this.undoStack.length - 1];

    if (previousEntry?.command.canMergeWith?.(command, { elapsedMs: now - previousEntry.executedAt })) {
      const mergedCommand = previousEntry.command.mergeWith?.(command) ?? previousEntry.command;
      previousEntry.command = mergedCommand;
      previousEntry.executedAt = now;
    } else {
      this.undoStack.push({ command, executedAt: now });
    }

    this.state = nextState;
    this.redoStack = [];
    this.revision += 1;
    this.validation = validateEditorState(this.state);
    this.notify();
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) {
      return;
    }

    this.state = this.assertValid(entry.command.undo(this.state));
    this.redoStack.push({ ...entry, executedAt: this.clock() });
    this.revision += 1;
    this.validation = validateEditorState(this.state);
    this.notify();
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) {
      return;
    }

    this.state = this.assertValid(entry.command.execute(this.state));
    this.undoStack.push({ ...entry, executedAt: this.clock() });
    this.revision += 1;
    this.validation = validateEditorState(this.state);
    this.notify();
  }

  setState(nextState: EditorState, options: { clearHistory?: boolean; markSaved?: boolean; affectsDirty?: boolean } = {}) {
    this.state = this.assertValid(nextState);
    if (options.clearHistory) {
      this.undoStack = [];
      this.redoStack = [];
    }
    if (options.affectsDirty) {
      this.revision += 1;
    }
    if (options.markSaved) {
      this.savedRevision = this.revision;
    }
    this.validation = validateEditorState(this.state);
    this.notify();
  }

  markSaved() {
    this.savedRevision = this.revision;
    this.notify();
  }

  private assertValid(state: EditorState): EditorState {
    const normalized = normalizeEditorState(state);
    const validation = validateEditorState(normalized);
    if (!validation.valid) {
      const summary = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
      throw new Error(`Command produced invalid editor state. ${summary}`);
    }
    return normalized;
  }

  private notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function historyEntry(entry: InternalHistoryEntry): CommandHistoryEntry {
  return {
    id: entry.command.id,
    label: entry.command.label,
    source: entry.command.metadata?.source,
    metadata: entry.command.metadata,
    executedAt: entry.executedAt,
  };
}
