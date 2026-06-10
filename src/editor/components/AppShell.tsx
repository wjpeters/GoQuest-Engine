import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code2, Database, GitBranch, Plus, Trophy } from "lucide-react";
import { generateWorldSpec } from "../../ai/GenerateWorldSpec";
import type { EntitySpec, EntityType, InteractionSpec, WorldSpec } from "../../engine/quest/WorldSpec";
import type { QuestSpec } from "../../engine/quest/QuestSpec";
import { CyberRiskRoom } from "../../templates/CyberRiskRoom";
import {
  AddEntityCommand,
  AddInteractionCommand,
  ChangeMaterialCommand,
  CommandManager,
  DeleteEntityCommand,
  DeleteInteractionCommand,
  DuplicateEntityCommand,
  ReplaceWorldSpecCommand,
  UpdateEntityCommand,
  UpdateInteractionCommand,
  UpdateQuestStateCommand,
  UpdateTransformCommand,
  ensureUniqueId,
  type EditorCommand,
} from "../commands";
import { createEditorState } from "../state/EditorState";
import { TopToolbar } from "./TopToolbar";
import { LeftSidebar } from "./LeftSidebar";
import { Viewport3D } from "./Viewport3D";
import { Inspector } from "./Inspector";
import { FlowPanel } from "./FlowPanel";
import { AssetPanel } from "./AssetPanel";
import { QuestPanel } from "./QuestPanel";
import { JsonPanel } from "./JsonPanel";
import { ExportDialog } from "./ExportDialog";
import type { QuestRuntimeMessage } from "../../engine/quest/QuestRuntime";

type LowerTab = "flow" | "quest" | "assets" | "json";

const lowerTabs: Array<{ id: LowerTab; label: string; icon: typeof GitBranch }> = [
  { id: "flow", label: "Flow", icon: GitBranch },
  { id: "quest", label: "Quest", icon: Trophy },
  { id: "assets", label: "Assets", icon: Database },
  { id: "json", label: "JSON", icon: Code2 },
];

export function AppShell() {
  const commandManagerRef = useRef<CommandManager | null>(null);
  if (!commandManagerRef.current) {
    const initialWorld = structuredClone(CyberRiskRoom);
    commandManagerRef.current = new CommandManager(
      createEditorState(initialWorld, { selectedEntityId: initialWorld.entities[1]?.id }),
    );
  }

  const commandManager = commandManagerRef.current!;
  const [snapshot, setSnapshot] = useState(() => commandManager.getSnapshot());
  const [activeTab, setActiveTab] = useState<LowerTab>("flow");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [message, setMessage] = useState<QuestRuntimeMessage>();
  const world = snapshot.state.world;
  const selectedId = snapshot.state.selectedEntityId;
  const selectedEntity = useMemo(() => world.entities.find((entity) => entity.id === selectedId), [selectedId, world.entities]);

  useEffect(() => {
    const unsubscribe = commandManager.subscribe(setSnapshot);
    return () => {
      unsubscribe();
    };
  }, [commandManager]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const usesModifier = event.metaKey || event.ctrlKey;
      if (usesModifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          commandManager.redo();
        } else {
          commandManager.undo();
        }
        return;
      }

      if (event.ctrlKey && key === "y") {
        event.preventDefault();
        commandManager.redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandManager]);

  const executeCommand = useCallback(
    (command: EditorCommand) => {
      commandManager.execute(command);
    },
    [commandManager],
  );

  const selectEntity = useCallback(
    (id: string) => {
      commandManager.setState({
        ...commandManager.getState(),
        selectedEntityId: id,
        selectedInteractionId: undefined,
      });
    },
    [commandManager],
  );

  const selectInteraction = useCallback(
    (id: string) => {
      commandManager.setState({
        ...commandManager.getState(),
        selectedInteractionId: id,
      });
    },
    [commandManager],
  );

  const updateSelectedEntity = (patch: Partial<EntitySpec>) => {
    if (!selectedId) {
      return;
    }
    executeCommand(new UpdateEntityCommand(selectedId, patch, { source: "inspector" }));
  };

  const updateSelectedTransform = (patch: Partial<EntitySpec["transform"]>) => {
    if (!selectedId) {
      return;
    }
    executeCommand(new UpdateTransformCommand(selectedId, patch, { source: "inspector" }));
  };

  const updateSelectedMaterial = (patch: Partial<EntitySpec["material"]>) => {
    if (!selectedId) {
      return;
    }
    executeCommand(new ChangeMaterialCommand(selectedId, patch, { source: "inspector" }));
  };

  const addEntity = (type: EntityType) => {
    executeCommand(new AddEntityCommand(createDefaultEntity(type, world), { source: "hierarchy", entityType: type }));
  };

  const deleteSelected = () => {
    if (!selectedId) {
      return;
    }
    executeCommand(new DeleteEntityCommand(selectedId, { source: "hierarchy" }));
  };

  const duplicateSelected = () => {
    if (!selectedId) {
      return;
    }
    executeCommand(new DuplicateEntityCommand(selectedId, { source: "hierarchy" }));
  };

  const addInteraction = () => {
    const interaction = createDefaultInteraction(world, selectedId);
    executeCommand(new AddInteractionCommand(interaction, { source: "flow" }));
    setActiveTab("flow");
  };

  const updateInteraction = (interactionId: string, patch: Partial<InteractionSpec>) => {
    executeCommand(new UpdateInteractionCommand(interactionId, patch, { source: "flow" }));
  };

  const deleteInteraction = (interactionId: string) => {
    executeCommand(new DeleteInteractionCommand(interactionId, { source: "flow" }));
  };

  const updateQuest = (patch: Partial<QuestSpec>) => {
    executeCommand(new UpdateQuestStateCommand(patch, { source: "quest" }));
  };

  const replaceWorld = (nextWorld: WorldSpec, label: string, source: "json" | "ai") => {
    executeCommand(new ReplaceWorldSpecCommand(nextWorld, label, { source }));
  };

  const generateSpec = async () => {
    const prompt = window.prompt("Quest prompt", "Cyber awareness onboarding room");
    if (!prompt) {
      return;
    }
    const generated = await generateWorldSpec(prompt);
    replaceWorld(generated, "Apply AI spec", "ai");
    setActiveTab("flow");
  };

  return (
    <div className="app-shell">
      <TopToolbar
        world={world}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((value) => !value)}
        onExport={() => setIsExportOpen(true)}
        onGenerate={generateSpec}
        canUndo={snapshot.canUndo}
        canRedo={snapshot.canRedo}
        undoLabel={snapshot.undoLabel}
        redoLabel={snapshot.redoLabel}
        onUndo={() => commandManager.undo()}
        onRedo={() => commandManager.redo()}
        onReset={() => {
          const reset = structuredClone(CyberRiskRoom);
          commandManager.setState(createEditorState(reset, { selectedEntityId: reset.entities[1]?.id }), {
            clearHistory: true,
            markSaved: true,
          });
          setMessage(undefined);
        }}
      />

      <div className={`workspace ${isInspectorOpen ? "" : "inspector-collapsed"}`}>
        <LeftSidebar
          world={world}
          selectedId={selectedId}
          history={snapshot.history}
          onSelectEntity={selectEntity}
          onTemplate={(template) => {
            const next = structuredClone(template);
            commandManager.setState(
              createEditorState(next, { selectedEntityId: next.entities.find((entity) => entity.selectable)?.id }),
              { clearHistory: true, markSaved: true },
            );
            setActiveTab("flow");
            setMessage(undefined);
          }}
          onAddEntity={addEntity}
          onToggleVisible={(id) => {
            const entity = world.entities.find((item) => item.id === id);
            if (entity) {
              executeCommand(new UpdateEntityCommand(id, { visible: !entity.visible }, { source: "hierarchy" }));
            }
          }}
          onDeleteEntity={(id) => executeCommand(new DeleteEntityCommand(id, { source: "hierarchy" }))}
          onDuplicateEntity={(id) => executeCommand(new DuplicateEntityCommand(id, { source: "hierarchy" }))}
        />

        <div className="center-column">
          <Viewport3D
            world={world}
            selectedId={selectedId}
            onSelectEntity={selectEntity}
            onWorldChange={(nextWorld) => {
              commandManager.setState({
                ...commandManager.getState(),
                world: nextWorld,
              });
            }}
            onRuntimeMessage={setMessage}
          />

          {message ? (
            <div className={`runtime-message ${message.tone}`}>
              <strong>{message.title ?? "Quest update"}</strong>
              <span>{message.message}</span>
              <button type="button" onClick={() => setMessage(undefined)}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="bottom-dock">
            <nav className="dock-tabs">
              {lowerTabs.map(({ id, label, icon: Icon }) => (
                <button className={activeTab === id ? "active" : ""} type="button" key={id} onClick={() => setActiveTab(id)}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="dock-body">
              {activeTab === "flow" ? (
                <FlowPanel
                  world={world}
                  selectedEntityId={selectedId}
                  selectedInteractionId={snapshot.state.selectedInteractionId}
                  onSelectInteraction={selectInteraction}
                  onAddInteraction={addInteraction}
                  onUpdateInteraction={updateInteraction}
                  onDeleteInteraction={deleteInteraction}
                />
              ) : null}
              {activeTab === "quest" ? <QuestPanel world={world} onUpdateQuest={updateQuest} /> : null}
              {activeTab === "assets" ? <AssetPanel world={world} /> : null}
              {activeTab === "json" ? <JsonPanel world={world} onApply={(nextWorld) => replaceWorld(nextWorld, "Apply JSON", "json")} /> : null}
            </div>
          </div>
        </div>

        {isInspectorOpen ? (
          <Inspector
            entity={selectedEntity}
            onPatch={updateSelectedEntity}
            onTransformPatch={updateSelectedTransform}
            onMaterialPatch={updateSelectedMaterial}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
          />
        ) : null}
      </div>

      <button className="floating-add" type="button" title="Add box" onClick={() => addEntity("box")}>
        <Plus size={18} />
      </button>

      {isExportOpen ? <ExportDialog world={world} onClose={() => setIsExportOpen(false)} /> : null}
    </div>
  );
}

function createDefaultEntity(type: EntityType, world: WorldSpec): EntitySpec {
  const id = ensureUniqueId(`${type}-${Math.random().toString(36).slice(2, 8)}`, world.entities.map((entity) => entity.id));
  return {
    id,
    name: `New ${type}`,
    type,
    transform: {
      position: [Math.round((Math.random() * 3 - 1.5) * 10) / 10, 0.4, Math.round((Math.random() * 2 - 1) * 10) / 10],
      rotation: [0, 0, 0],
      scale: type === "plane" ? [1.6, 1, 1.2] : [0.8, 0.8, 0.8],
    },
    material: { color: "#7dd3fc", opacity: 0.92 },
    geometry: {},
    visible: true,
    selectable: true,
    interactionIds: [],
  };
}

function createDefaultInteraction(world: WorldSpec, selectedEntityId?: string): InteractionSpec {
  const idBase = selectedEntityId ? `click-${selectedEntityId}` : "scene-start";
  return {
    id: ensureUniqueId(idBase, world.interactions.map((interaction) => interaction.id)),
    trigger: selectedEntityId ? "click" : "sceneStart",
    targetEntityId: selectedEntityId,
    conditions: [],
    actions: [
      {
        type: "showMessage",
        title: "Interaction",
        message: "New interaction triggered.",
        tone: "info",
      },
    ],
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
