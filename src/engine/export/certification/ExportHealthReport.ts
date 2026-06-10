import type { BundleManifest } from "../BundleManifest";
import type { StaticExportFiles } from "../ExportBuilder";
import type { CompatibilityResult } from "../../version/Compatibility";
import type { MigrationResult } from "../../version/migrations";

export type ExportHealthStatus = "pass" | "warn" | "fail";

export type ExportHealthCheck = {
  id: string;
  label: string;
  status: ExportHealthStatus;
  message: string;
  details?: unknown;
  durationMs?: number;
};

export type ExportHealthReport = {
  id: string;
  createdAt: string;
  overallStatus: ExportHealthStatus;
  buildId: string;
  engineVersion: string;
  runtimeVersion: string;
  specVersion: string;
  exportFormatVersion: string;
  compatibility: CompatibilityResult;
  migrationsApplied: string[];
  migrationWarnings: string[];
  checks: ExportHealthCheck[];
  metrics: {
    bundleBytes: number;
    assetBytes: number;
    totalBytes: number;
    estimatedFirstRenderMs?: number;
    entityCount: number;
    interactionCount: number;
    assetCount: number;
  };
  artifacts: {
    hasSingleHtml: boolean;
    hasZip: boolean;
    files: Array<{
      path: string;
      bytes: number;
      hash?: string;
    }>;
  };
};

export type ExportPackage = {
  buildId: string;
  createdAt: string;
  runtimeVersion: string;
  specVersion: string;
  exportFormatVersion: string;
  files: StaticExportFiles;
  manifest: BundleManifest;
  compatibility: CompatibilityResult;
  migration: MigrationResult;
};

export type CertifiedExportResult = {
  package: ExportPackage;
  healthReport: ExportHealthReport;
  canDownload: boolean;
};

export type BrowserSmokeResult = {
  available: boolean;
  ready: boolean;
  renderer?: "webgl2" | "canvas2d" | "webgpu" | "none";
  firstRenderMs?: number;
  errors: string[];
  events: string[];
  interactionChanged: boolean;
  interactionMessage: string;
};

export function overallStatus(checks: ExportHealthCheck[]): ExportHealthStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}
