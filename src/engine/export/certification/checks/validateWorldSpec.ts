import { WorldSpecSchema, type WorldSpec } from "../../../quest/WorldSpec";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateWorldSpec(world: WorldSpec): ExportHealthCheck {
  const result = WorldSpecSchema.safeParse(world);

  if (result.success) {
    return check("worldspec_schema_valid", "WorldSpec schema valid", "pass", "Quest spec is valid and exportable.");
  }

  return check(
    "worldspec_schema_valid",
    "WorldSpec schema valid",
    "fail",
    "Quest spec has schema errors that must be fixed before export.",
    result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  );
}
