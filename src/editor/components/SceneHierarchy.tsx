import { Box, Circle, Cone, Copy, Cylinder, Eye, EyeOff, Image, MousePointer2, SquareDashedMousePointer, Trash2, Type } from "lucide-react";
import type { EntitySpec } from "../../engine/quest/WorldSpec";

interface SceneHierarchyProps {
  entities: EntitySpec[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
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

export function SceneHierarchy({ entities, selectedId, onSelect, onToggleVisible, onDelete, onDuplicate }: SceneHierarchyProps) {
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
              <span
                className="row-icon-action"
                role="button"
                tabIndex={0}
                title="Duplicate entity"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate(entity.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onDuplicate(entity.id);
                  }
                }}
              >
                <Copy size={14} />
              </span>
              <span
                className="row-icon-action danger"
                role="button"
                tabIndex={0}
                title="Delete entity"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(entity.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(entity.id);
                  }
                }}
              >
                <Trash2 size={14} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
