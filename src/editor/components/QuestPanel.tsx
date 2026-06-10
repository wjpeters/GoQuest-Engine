import { Flag, Trophy } from "lucide-react";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface QuestPanelProps {
  world: WorldSpec;
}

export function QuestPanel({ world }: QuestPanelProps) {
  return (
    <section className="lower-panel">
      <div className="lower-panel-header">
        <div>
          <span>Quest state</span>
          <strong>{world.quest.currentStage}</strong>
        </div>
        <Trophy size={18} />
      </div>
      <div className="quest-state-grid">
        <div className="metric-card">
          <small>Score</small>
          <strong>{world.quest.score}</strong>
        </div>
        <div className="metric-card">
          <small>Stages</small>
          <strong>{world.quest.stages.length}</strong>
        </div>
        <div className="metric-card">
          <small>Outcomes</small>
          <strong>{world.quest.outcomes.length}</strong>
        </div>
      </div>
      <div className="stage-list">
        {world.quest.stages.map((stage) => (
          <article className={`stage-row ${stage.id === world.quest.currentStage ? "active" : ""}`} key={stage.id}>
            <Flag size={15} />
            <span>
              <strong>{stage.title}</strong>
              <small>{stage.description}</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
