export const QuestEvents = {
  actionApplied: "quest:action-applied",
  message: "quest:message",
  stageChanged: "quest:stage-changed",
  completed: "quest:completed",
  worldChanged: "quest:world-changed",
} as const;

export type QuestEventName = (typeof QuestEvents)[keyof typeof QuestEvents];
