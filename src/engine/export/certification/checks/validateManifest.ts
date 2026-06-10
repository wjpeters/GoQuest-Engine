import { ExportManifestSchema, type BundleManifest } from "../../BundleManifest";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateManifest(manifest: BundleManifest): ExportHealthCheck {
  const result = ExportManifestSchema.safeParse(manifest);

  if (result.success) {
    return check("manifest_valid", "Manifest valid", "pass", "Manifest includes versioned contract metadata, files, capabilities and assets.");
  }

  return check(
    "manifest_valid",
    "Manifest valid",
    "fail",
    "Manifest is missing required export certification metadata.",
    result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  );
}
