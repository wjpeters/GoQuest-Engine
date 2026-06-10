import { z } from "zod";
import { ActionSchema } from "./Actions";
import { ConditionSchema } from "./Conditions";

export const QuestStageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
});

export const QuestRuleSchema = z.object({
  id: z.string().min(1),
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).default([]),
});

export const QuestOutcomeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  minScore: z.number().optional(),
});

export const QuestSpecSchema = z.object({
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  score: z.number().default(0),
  stages: z.array(QuestStageSchema).min(1),
  currentStage: z.string().min(1),
  outcomes: z.array(QuestOutcomeSchema).default([]),
  rules: z.array(QuestRuleSchema).default([]),
  completionConditions: z.array(ConditionSchema).default([]),
});

export type QuestSpec = z.infer<typeof QuestSpecSchema>;
export type QuestStageSpec = z.infer<typeof QuestStageSchema>;
export type QuestRuleSpec = z.infer<typeof QuestRuleSchema>;
export type QuestOutcomeSpec = z.infer<typeof QuestOutcomeSchema>;
