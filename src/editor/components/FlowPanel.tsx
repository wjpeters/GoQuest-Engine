import { GitBranch, MousePointerClick, Plus, PlayCircle, Trash2 } from "lucide-react";
import type { InteractionSpec, WorldSpec } from "../../engine/quest/WorldSpec";

interface FlowPanelProps {
  world: WorldSpec;
  selectedEntityId?: string;
  selectedInteractionId?: string;
  onSelectInteraction: (id: string) => void;
  onAddInteraction: () => void;
  onUpdateInteraction: (id: string, patch: Partial<InteractionSpec>) => void;
  onDeleteInteraction: (id: string) => void;
}

export function FlowPanel({
  world,
  selectedEntityId,
  selectedInteractionId,
  onSelectInteraction,
  onAddInteraction,
  onUpdateInteraction,
  onDeleteInteraction,
}: FlowPanelProps) {
  return (
    <section className="lower-panel">
      <div className="lower-panel-header">
        <div>
          <span>Quest flow</span>
          <strong>
            {world.interactions.length} interactions{selectedEntityId ? ` · target ${selectedEntityId}` : ""}
          </strong>
        </div>
        <button className="tool-button compact" type="button" onClick={onAddInteraction}>
          <Plus size={15} />
          Interaction
        </button>
      </div>
      <div className="flow-list">
        {world.interactions.map((interaction) => (
          <article
            className={`flow-card editable ${selectedInteractionId === interaction.id ? "selected" : ""}`}
            key={interaction.id}
            onClick={() => onSelectInteraction(interaction.id)}
          >
            <div className="flow-card-header">
              <div className="flow-trigger">
                {interaction.trigger === "sceneStart" ? <PlayCircle size={15} /> : <MousePointerClick size={15} />}
                {interaction.trigger}
              </div>
              <button
                className="icon-button danger small"
                type="button"
                title="Delete interaction"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteInteraction(interaction.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <strong>{interaction.id}</strong>
            <div className="flow-edit-grid">
              <label>
                <small>Trigger</small>
                <select
                  value={interaction.trigger}
                  onChange={(event) => {
                    const trigger = event.target.value as InteractionSpec["trigger"];
                    onUpdateInteraction(interaction.id, {
                      trigger,
                      targetEntityId: trigger === "sceneStart" ? undefined : interaction.targetEntityId,
                    });
                  }}
                >
                  <option value="click">click</option>
                  <option value="hover">hover</option>
                  <option value="enterZone">enterZone</option>
                  <option value="sceneStart">sceneStart</option>
                </select>
              </label>
              <label>
                <small>Target</small>
                <select
                  value={interaction.targetEntityId ?? ""}
                  onChange={(event) => {
                    const targetEntityId = event.target.value || undefined;
                    onUpdateInteraction(interaction.id, { targetEntityId });
                  }}
                >
                  <option value="">Scene</option>
                  {world.entities.map((entity) => (
                    <option value={entity.id} key={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <small>
              {interaction.conditions.length} conditions · {interaction.actions.length} actions
            </small>
          </article>
        ))}
        {!world.interactions.length ? (
          <div className="empty-panel-state">
            <GitBranch size={18} />
            Add an interaction to connect scene events to quest actions.
          </div>
        ) : null}
      </div>
    </section>
  );
}
