import { Eye, EyeOff, SlidersHorizontal, Trash2 } from "lucide-react";
import type { EntitySpec, EntityType } from "../../engine/quest/WorldSpec";

interface InspectorProps {
  entity?: EntitySpec;
  onPatch: (patch: Partial<EntitySpec>) => void;
  onDelete: () => void;
}

const entityTypes: EntityType[] = ["box", "sphere", "plane", "cylinder", "cone", "text", "hotspot", "imageBillboard"];

export function Inspector({ entity, onPatch, onDelete }: InspectorProps) {
  if (!entity) {
    return (
      <aside className="right-inspector">
        <div className="inspector-empty">
          <SlidersHorizontal size={24} />
          <strong>No entity selected</strong>
          <span>Pick an object to edit transform, material, and interaction metadata.</span>
        </div>
      </aside>
    );
  }

  const patchTransform = (key: keyof EntitySpec["transform"], index: number, value: number) => {
    const next = [...entity.transform[key]] as [number, number, number];
    next[index] = value;
    onPatch({ transform: { ...entity.transform, [key]: next } });
  };

  return (
    <aside className="right-inspector">
      <div className="inspector-header">
        <div>
          <span>Inspector</span>
          <strong>{entity.name}</strong>
        </div>
        <button className="icon-button danger" type="button" title="Delete entity" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      <label className="field">
        <span>Name</span>
        <input value={entity.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </label>

      <label className="field">
        <span>Type</span>
        <select value={entity.type} onChange={(event) => onPatch({ type: event.target.value as EntityType })}>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <div className="toggle-row">
        <button className={`toggle-button ${entity.visible ? "active" : ""}`} type="button" onClick={() => onPatch({ visible: !entity.visible })}>
          {entity.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          Visible
        </button>
        <button
          className={`toggle-button ${entity.selectable ? "active" : ""}`}
          type="button"
          onClick={() => onPatch({ selectable: !entity.selectable })}
        >
          Selectable
        </button>
      </div>

      <VectorEditor label="Position" values={entity.transform.position} onChange={(index, value) => patchTransform("position", index, value)} />
      <VectorEditor label="Rotation" values={entity.transform.rotation} onChange={(index, value) => patchTransform("rotation", index, value)} />
      <VectorEditor label="Scale" values={entity.transform.scale} onChange={(index, value) => patchTransform("scale", index, value)} min={0.05} />

      <div className="field-grid two">
        <label className="field">
          <span>Color</span>
          <input type="color" value={entity.material.color} onChange={(event) => onPatch({ material: { ...entity.material, color: event.target.value } })} />
        </label>
        <label className="field">
          <span>Opacity</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={entity.material.opacity}
            onChange={(event) => onPatch({ material: { ...entity.material, opacity: Number(event.target.value) } })}
          />
        </label>
      </div>

      <label className="field">
        <span>Label</span>
        <input value={entity.label ?? ""} onChange={(event) => onPatch({ label: event.target.value })} placeholder="Optional display label" />
      </label>

      <div className="advanced-note">
        Interaction ids: {entity.interactionIds.length ? entity.interactionIds.join(", ") : "none"}
      </div>
    </aside>
  );
}

function VectorEditor({
  label,
  values,
  onChange,
  min,
}: {
  label: string;
  values: [number, number, number];
  onChange: (index: number, value: number) => void;
  min?: number;
}) {
  return (
    <section className="vector-editor">
      <span>{label}</span>
      <div className="vector-grid">
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <label key={axis}>
            <small>{axis}</small>
            <input type="number" min={min} step={0.05} value={values[index]} onChange={(event) => onChange(index, Number(event.target.value))} />
          </label>
        ))}
      </div>
    </section>
  );
}
