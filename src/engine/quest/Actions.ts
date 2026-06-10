import { z } from "zod";

const Vec3TupleSchema = z.tuple([z.number(), z.number(), z.number()]);

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("setVariable"),
    variable: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({
    type: z.literal("incrementVariable"),
    variable: z.string().min(1),
    amount: z.number().default(1),
  }),
  z.object({
    type: z.literal("addScore"),
    amount: z.number(),
  }),
  z.object({
    type: z.literal("showMessage"),
    title: z.string().optional(),
    message: z.string().min(1),
    tone: z.enum(["info", "success", "warning"]).default("info"),
  }),
  z.object({
    type: z.literal("highlightEntity"),
    entityId: z.string().min(1),
    color: z.string().default("#7dd3fc"),
  }),
  z.object({
    type: z.literal("hideEntity"),
    entityId: z.string().min(1),
  }),
  z.object({
    type: z.literal("showEntity"),
    entityId: z.string().min(1),
  }),
  z.object({
    type: z.literal("moveCamera"),
    position: Vec3TupleSchema,
    target: Vec3TupleSchema,
    durationMs: z.number().min(0).default(700),
  }),
  z.object({
    type: z.literal("gotoStage"),
    stageId: z.string().min(1),
  }),
  z.object({
    type: z.literal("completeQuest"),
    outcomeId: z.string().optional(),
  }),
]);

export type ActionSpec = z.infer<typeof ActionSchema>;
