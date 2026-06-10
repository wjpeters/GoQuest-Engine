import { GitBranch, MousePointerClick, PlayCircle } from "lucide-react";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface FlowPanelProps {
  world: WorldSpec;
}

export function FlowPanel({ world }: FlowPanelProps) {
  return (
    <section className="lower-panel">
      <div className="lower-panel-header">
        <div>
          <span>Quest flow</span>
          <strong>{world.interactions.length} interactions</strong>
        </div>
        <GitBranch size={18} />
      </div>
      <div className="flow-list">
        {world.interactions.map((interaction) => (
          <article className="flow-card" key={interaction.id}>
            <div className="flow-trigger">
              {interaction.trigger === "sceneStart" ? <PlayCircle size={15} /> : <MousePointerClick size={15} />}
              {interaction.trigger}
            </div>
            <strong>{interaction.id}</strong>
            <span>{interaction.targetEntityId ?? "Scene"}</span>
            <small>
              {interaction.conditions.length} conditions · {interaction.actions.length} actions
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
