import { useCallback, useMemo, useState } from "react";
import { Code2, Database, GitBranch, Plus, Trophy } from "lucide-react";
import { generateWorldSpec } from "../../ai/GenerateWorldSpec";
import type { EntitySpec, EntityType, WorldSpec } from "../../engine/quest/WorldSpec";
import { WorldSpecSchema } from "../../engine/quest/WorldSpec";
import { CyberRiskRoom } from "../../templates/CyberRiskRoom";
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
  const [world, setWorld] = useState<WorldSpec>(() => structuredClone(CyberRiskRoom));
  const [selectedId, setSelectedId] = useState<string | undefined>(world.entities[1]?.id);
  const [activeTab, setActiveTab] = useState<LowerTab>("flow");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [message, setMessage] = useState<QuestRuntimeMessage>();
  const selectedEntity = useMemo(() => world.entities.find((entity) => entity.id === selectedId), [selectedId, world.entities]);

  const updateWorld = useCallback((updater: (draft: WorldSpec) => void) => {
    setWorld((current) => {
      const next = structuredClone(current);
      updater(next);
      return WorldSpecSchema.parse(next);
    });
  }, []);

  const updateSelectedEntity = (patch: Partial<EntitySpec>) => {
    if (!selectedId) {
      return;
    }
    updateWorld((draft) => {
      const index = draft.entities.findIndex((entity) => entity.id === selectedId);
      if (index >= 0) {
        draft.entities[index] = { ...draft.entities[index], ...patch };
      }
    });
  };

  const addEntity = (type: EntityType) => {
    const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
    const entity: EntitySpec = {
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
    updateWorld((draft) => {
      draft.entities.push(entity);
    });
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) {
      return;
    }
    updateWorld((draft) => {
      draft.entities = draft.entities.filter((entity) => entity.id !== selectedId);
      draft.interactions = draft.interactions.filter((interaction) => interaction.targetEntityId !== selectedId);
    });
    setSelectedId(undefined);
  };

  const generateSpec = async () => {
    const prompt = window.prompt("Quest prompt", "Cyber awareness onboarding room");
    if (!prompt) {
      return;
    }
    const generated = await generateWorldSpec(prompt);
    setWorld(generated);
    setSelectedId(generated.entities.find((entity) => entity.selectable)?.id);
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
        onReset={() => {
          const reset = structuredClone(CyberRiskRoom);
          setWorld(reset);
          setSelectedId(reset.entities[1]?.id);
          setMessage(undefined);
        }}
      />

      <div className={`workspace ${isInspectorOpen ? "" : "inspector-collapsed"}`}>
        <LeftSidebar
          world={world}
          selectedId={selectedId}
          onSelectEntity={setSelectedId}
          onTemplate={(template) => {
            const next = structuredClone(template);
            setWorld(next);
            setSelectedId(next.entities.find((entity) => entity.selectable)?.id);
            setActiveTab("flow");
            setMessage(undefined);
          }}
          onAddEntity={addEntity}
          onToggleVisible={(id) => {
            updateWorld((draft) => {
              const entity = draft.entities.find((item) => item.id === id);
              if (entity) {
                entity.visible = !entity.visible;
              }
            });
          }}
        />

        <div className="center-column">
          <Viewport3D
            world={world}
            selectedId={selectedId}
            onSelectEntity={setSelectedId}
            onWorldChange={setWorld}
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
              {activeTab === "flow" ? <FlowPanel world={world} /> : null}
              {activeTab === "quest" ? <QuestPanel world={world} /> : null}
              {activeTab === "assets" ? <AssetPanel world={world} /> : null}
              {activeTab === "json" ? <JsonPanel world={world} onApply={setWorld} /> : null}
            </div>
          </div>
        </div>

        {isInspectorOpen ? <Inspector entity={selectedEntity} onPatch={updateSelectedEntity} onDelete={deleteSelected} /> : null}
      </div>

      <button className="floating-add" type="button" title="Add box" onClick={() => addEntity("box")}>
        <Plus size={18} />
      </button>

      {isExportOpen ? <ExportDialog world={world} onClose={() => setIsExportOpen(false)} /> : null}
    </div>
  );
}
