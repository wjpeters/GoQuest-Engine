import { z } from "zod";
import type { BundleManifest } from "../../BundleManifest";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

const ManifestSchema = z.object({
  engine: z.literal("ai-quest-engine-3d-lite"),
  buildId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  specVersion: z.string().min(1),
  createdAt: z.string().min(1),
  files: z.array(
    z.object({
      path: z.string().min(1),
      bytes: z.number().nonnegative(),
      hash: z.string().min(1),
    }),
  ),
  capabilities: z.object({
    renderers: z.array(z.enum(["webgl2", "canvas2d", "webgpu"])).min(1),
    fileMode: z.boolean(),
    staticServer: z.boolean(),
    embeddedQuestSpec: z.boolean(),
    networkRequired: z.literal(false),
  }),
  assets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      embedded: z.boolean(),
      uri: z.string(),
    }),
  ),
  standalone: z.literal(true),
  requiresNetwork: z.literal(false),
});

export function validateManifest(manifest: BundleManifest): ExportHealthCheck {
  const result = ManifestSchema.safeParse(manifest);

  if (result.success) {
    return check("manifest_valid", "Manifest valid", "pass", "Manifest includes build metadata, files, capabilities and assets.");
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
