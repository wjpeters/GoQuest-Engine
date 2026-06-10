import { z } from "zod";

export const ConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("variableEquals"),
    variable: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({
    type: z.literal("variableAtLeast"),
    variable: z.string().min(1),
    value: z.number(),
  }),
  z.object({
    type: z.literal("scoreAtLeast"),
    value: z.number(),
  }),
  z.object({
    type: z.literal("stageIs"),
    stageId: z.string().min(1),
  }),
]);

export type ConditionSpec = z.infer<typeof ConditionSchema>;

export interface ConditionContext {
  variables: Record<string, string | number | boolean>;
  score: number;
  currentStage: string;
}

export function evaluateCondition(condition: ConditionSpec, context: ConditionContext): boolean {
  switch (condition.type) {
    case "variableEquals":
      return context.variables[condition.variable] === condition.value;
    case "variableAtLeast": {
      const value = context.variables[condition.variable];
      return typeof value === "number" && value >= condition.value;
    }
    case "scoreAtLeast":
      return context.score >= condition.value;
    case "stageIs":
      return context.currentStage === condition.stageId;
  }
}

export function evaluateConditions(conditions: ConditionSpec[] | undefined, context: ConditionContext): boolean {
  if (!conditions?.length) {
    return true;
  }

  return conditions.every((condition) => evaluateCondition(condition, context));
}
