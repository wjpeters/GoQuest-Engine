import { Box, Circle, Cone, Cylinder, Eye, EyeOff, Image, MousePointer2, SquareDashedMousePointer, Type } from "lucide-react";
import type { EntitySpec } from "../../engine/quest/WorldSpec";

interface SceneHierarchyProps {
  entities: EntitySpec[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
}

const iconByType = {
  box: Box,
  sphere: Circle,
  plane: SquareDashedMousePointer,
  cylinder: Cylinder,
  cone: Cone,
  text: Type,
  hotspot: MousePointer2,
  imageBillboard: Image,
};

export function SceneHierarchy({ entities, selectedId, onSelect, onToggleVisible }: SceneHierarchyProps) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <span>Scene hierarchy</span>
        <span>{entities.length}</span>
      </div>
      <div className="hierarchy-list">
        {entities.map((entity) => {
          const Icon = iconByType[entity.type];
          return (
            <button
              className={`hierarchy-row ${selectedId === entity.id ? "selected" : ""}`}
              type="button"
              key={entity.id}
              onClick={() => onSelect(entity.id)}
            >
              <Icon size={16} />
              <span className="row-copy">
                <strong>{entity.name}</strong>
                <small>{entity.type}</small>
              </span>
              <span
                className="visibility-control"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleVisible(entity.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleVisible(entity.id);
                  }
                }}
              >
                {entity.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
