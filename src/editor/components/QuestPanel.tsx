import { Flag, Trophy } from "lucide-react";
import type { QuestSpec } from "../../engine/quest/QuestSpec";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface QuestPanelProps {
  world: WorldSpec;
  onUpdateQuest: (patch: Partial<QuestSpec>) => void;
}

export function QuestPanel({ world, onUpdateQuest }: QuestPanelProps) {
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
          <input
            type="number"
            value={world.quest.score}
            onChange={(event) => onUpdateQuest({ score: Number(event.target.value) })}
          />
        </div>
        <div className="metric-card">
          <small>Stages</small>
          <strong>{world.quest.stages.length}</strong>
        </div>
        <div className="metric-card">
          <small>Current stage</small>
          <select value={world.quest.currentStage} onChange={(event) => onUpdateQuest({ currentStage: event.target.value })}>
            {world.quest.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.title}
              </option>
            ))}
          </select>
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
