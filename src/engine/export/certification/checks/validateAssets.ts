import type { WorldSpec } from "../../../quest/WorldSpec";
import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateAssets(world: WorldSpec, files: StaticExportFiles): ExportHealthCheck {
  const missing = world.assets.filter((asset) => {
    if (asset.uri.startsWith("data:")) {
      return false;
    }

    const normalized = asset.uri.replace(/^\.\//, "");
    return !normalized || !(normalized in files);
  });

  if (missing.length === 0) {
    return check("assets_present", "Assets present", "pass", "All referenced assets are embedded or included in the export package.");
  }

  return check(
    "assets_present",
    "Assets present",
    "fail",
    "One or more assets are referenced but missing from the export package.",
    missing.map((asset) => ({
      id: asset.id,
      name: asset.name,
      uri: asset.uri,
    })),
  );
}
