import type { QuestOutcomeSpec, QuestSpec } from "./QuestSpec";

export function findBestOutcome(quest: QuestSpec): QuestOutcomeSpec | undefined {
  const outcomes = [...quest.outcomes].sort((a, b) => (b.minScore ?? 0) - (a.minScore ?? 0));
  return outcomes.find((outcome) => outcome.minScore === undefined || quest.score >= outcome.minScore);
}
