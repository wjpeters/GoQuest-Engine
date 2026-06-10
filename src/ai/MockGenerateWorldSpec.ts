import { WorldSpecSchema, type WorldSpec } from "../engine/quest/WorldSpec";
import { CyberRiskRoom } from "../templates/CyberRiskRoom";

export function mockGenerateWorldSpec(prompt: string): WorldSpec {
  const normalizedPrompt = prompt.trim() || "AI authored quest";
  const draft: WorldSpec = structuredClone(CyberRiskRoom);
  draft.id = `ai-${normalizedPrompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42) || "quest"}`;
  draft.title = normalizedPrompt.length > 42 ? `${normalizedPrompt.slice(0, 39)}...` : normalizedPrompt;
  draft.description = "Generated as validated JSON only. No executable JavaScript is produced by the AI workflow.";
  draft.metadata = { ...draft.metadata, generatedBy: "MockGenerateWorldSpec" };
  return WorldSpecSchema.parse(draft);
}
