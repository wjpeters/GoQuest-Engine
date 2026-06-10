import { z } from "zod";
import { ActionSchema } from "./Actions";
import { ConditionSchema } from "./Conditions";
import { QuestSpecSchema } from "./QuestSpec";

const Vec3TupleSchema = z.tuple([z.number(), z.number(), z.number()]);

export const EntityTypeSchema = z.enum([
  "box",
  "sphere",
  "plane",
  "cylinder",
  "cone",
  "text",
  "hotspot",
  "imageBillboard",
]);

export const EntitySpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: EntityTypeSchema,
  transform: z.object({
    position: Vec3TupleSchema.default([0, 0, 0]),
    rotation: Vec3TupleSchema.default([0, 0, 0]),
    scale: Vec3TupleSchema.default([1, 1, 1]),
  }),
  material: z.object({
    color: z.string().default("#8ab4ff"),
    opacity: z.number().min(0).max(1).default(1),
    roughness: z.number().min(0).max(1).optional(),
    emissive: z.string().optional(),
  }),
  geometry: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  visible: z.boolean().default(true),
  selectable: z.boolean().default(true),
  interactionIds: z.array(z.string()).default([]),
  label: z.string().optional(),
  assetId: z.string().optional(),
});

export const InteractionSpecSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(["click", "hover", "enterZone", "sceneStart"]),
  targetEntityId: z.string().optional(),
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).default([]),
});

export const AssetSpecSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["image", "audio", "data", "font"]).default("data"),
  name: z.string().min(1),
  uri: z.string().default(""),
  embedded: z.boolean().default(true),
});

export const WorldSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  version: z.string().default("0.1.0"),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  viewport: z.object({
    width: z.number().min(320).default(1280),
    height: z.number().min(240).default(720),
    background: z.string().default("#080b14"),
  }),
  environment: z.object({
    background: z.string().default("#080b14"),
    ambientColor: z.string().default("#c7d2fe"),
    showGrid: z.boolean().default(true),
    gridColor: z.string().default("#293246"),
  }),
  camera: z.object({
    position: Vec3TupleSchema.default([4, 4, 7]),
    target: Vec3TupleSchema.default([0, 0, 0]),
    fov: z.number().min(25).max(100).default(45),
    near: z.number().positive().default(0.1),
    far: z.number().positive().default(100),
  }),
  entities: z.array(EntitySpecSchema).default([]),
  interactions: z.array(InteractionSpecSchema).default([]),
  quest: QuestSpecSchema,
  assets: z.array(AssetSpecSchema).default([]),
  exportSettings: z.object({
    packageName: z.string().min(1).default("quest-export"),
    includeSourceSpec: z.boolean().default(true),
    minifyRuntime: z.boolean().default(false),
  }),
});

export type EntityType = z.infer<typeof EntityTypeSchema>;
export type EntitySpec = z.infer<typeof EntitySpecSchema>;
export type InteractionSpec = z.infer<typeof InteractionSpecSchema>;
export type AssetSpec = z.infer<typeof AssetSpecSchema>;
export type WorldSpec = z.infer<typeof WorldSpecSchema>;

export function parseWorldSpec(input: unknown): WorldSpec {
  return WorldSpecSchema.parse(input);
}

export function validateWorldSpec(input: unknown) {
  return WorldSpecSchema.safeParse(input);
}
