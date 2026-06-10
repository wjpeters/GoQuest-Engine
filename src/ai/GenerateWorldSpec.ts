import type { WorldSpec } from "../engine/quest/WorldSpec";
import { mockGenerateWorldSpec } from "./MockGenerateWorldSpec";

export async function generateWorldSpec(prompt: string): Promise<WorldSpec> {
  return mockGenerateWorldSpec(prompt);
}
