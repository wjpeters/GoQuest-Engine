import { Box, Circle, Cone, Cylinder, Layers3, MousePointer2, Plus, Sparkles } from "lucide-react";
import type { EntityType, WorldSpec } from "../../engine/quest/WorldSpec";
import { templates } from "../../templates";
import { SceneHierarchy } from "./SceneHierarchy";
import { ValidationPanel } from "./ValidationPanel";

interface LeftSidebarProps {
  world: WorldSpec;
  selectedId?: string;
  onSelectEntity: (id: string) => void;
  onTemplate: (template: WorldSpec) => void;
  onAddEntity: (type: EntityType) => void;
  onToggleVisible: (id: string) => void;
}

const addButtons: Array<{ type: EntityType; label: string; icon: typeof Box }> = [
  { type: "box", label: "Box", icon: Box },
  { type: "sphere", label: "Sphere", icon: Circle },
  { type: "cylinder", label: "Cylinder", icon: Cylinder },
  { type: "cone", label: "Cone", icon: Cone },
  { type: "hotspot", label: "Hotspot", icon: MousePointer2 },
];

export function LeftSidebar({
  world,
  selectedId,
  onSelectEntity,
  onTemplate,
  onAddEntity,
  onToggleVisible,
}: LeftSidebarProps) {
  return (
    <aside className="left-sidebar">
      <section className="panel-section">
        <div className="section-heading">
          <span>Templates</span>
          <Layers3 size={15} />
        </div>
        <div className="template-list">
          {templates.map((template) => (
            <button
              type="button"
              key={template.id}
              className={`template-card ${template.id === world.id ? "active" : ""}`}
              onClick={() => onTemplate(template)}
            >
              <strong>{template.title}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <span>Add primitive</span>
          <Plus size={15} />
        </div>
        <div className="primitive-grid">
          {addButtons.map(({ type, label, icon: Icon }) => (
            <button className="primitive-button" type="button" key={type} onClick={() => onAddEntity(type)}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <ValidationPanel world={world} />

      <div className="ai-safety-note">
        <Sparkles size={14} />
        AI output path is JSON-only and schema validated before it can enter the editor.
      </div>

      <SceneHierarchy
        entities={world.entities}
        selectedId={selectedId}
        onSelect={onSelectEntity}
        onToggleVisible={onToggleVisible}
      />
    </aside>
  );
}
