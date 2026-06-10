import { WorldSpecSchema, type WorldSpec } from "../engine/quest/WorldSpec";

export function repairSpec(input: unknown, fallback: WorldSpec): WorldSpec {
  const result = WorldSpecSchema.safeParse(input);
  return result.success ? result.data : fallback;
}
