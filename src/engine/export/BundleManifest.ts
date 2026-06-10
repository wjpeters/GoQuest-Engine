import { z } from "zod";
import { ENGINE_NAME } from "../version/EngineVersion";
import { RuntimeContractSchema } from "../version/RuntimeContract";
import type { CompatibilityResult } from "../version/Compatibility";
import type { MigrationResult } from "../version/migrations";

export const ExportFileRoleSchema = z.enum(["entry", "runtime", "spec", "asset", "manifest", "docs"]);

export const ExportManifestSchema = z.object({
  engine: z.literal(ENGINE_NAME),
  engineVersion: z.string().min(1),
  runtimeVersion: z.string().min(1),
  specVersion: z.string().min(1),
  exportFormatVersion: z.string().min(1),
  buildId: z.string().min(1),
  createdAt: z.string().min(1),
  sourceTemplateId: z.string().optional(),
  contract: RuntimeContractSchema,
  compatibility: z.object({
    status: z.enum(["compatible", "warning", "incompatible"]),
    issues: z.array(
      z.object({
        code: z.string().min(1),
        severity: z.enum(["info", "warn", "error"]),
        message: z.string().min(1),
        details: z.unknown().optional(),
      }),
    ),
  }),
  migration: z.object({
    fromVersion: z.string().min(1),
    toVersion: z.string().min(1),
    appliedMigrations: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
  capabilities: z.object({
    renderers: z.array(z.enum(["webgl2", "canvas2d", "webgpu"])).min(1),
    fileMode: z.boolean(),
    staticServer: z.boolean(),
    embeddedQuestSpec: z.boolean(),
    networkRequired: z.literal(false),
  }),
  capabilityIds: z.array(z.string().min(1)),
  files: z.array(
    z.object({
      path: z.string().min(1),
      bytes: z.number().nonnegative(),
      hash: z.string().min(1),
      sha256: z.string().optional(),
      role: ExportFileRoleSchema,
    }),
  ),
  assets: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      path: z.string().optional(),
      embedded: z.boolean().optional(),
      type: z.string(),
      bytes: z.number().optional(),
      uri: z.string().optional(),
    }),
  ),
  minimumBrowserNotes: z.string().optional(),
  standalone: z.literal(true),
  requiresNetwork: z.literal(false),
});

export type ExportManifest = z.infer<typeof ExportManifestSchema>;
export type ExportFileRole = z.infer<typeof ExportFileRoleSchema>;
export type BundleManifest = ExportManifest;

export type ManifestCompatibility = CompatibilityResult;
export type ManifestMigration = Pick<MigrationResult, "fromVersion" | "toVersion" | "appliedMigrations" | "warnings">;
