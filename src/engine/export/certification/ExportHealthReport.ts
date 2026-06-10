import type { BundleManifest } from "../BundleManifest";
import type { StaticExportFiles } from "../ExportBuilder";

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
  runtimeVersion: string;
  specVersion: string;
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
  files: StaticExportFiles;
  manifest: BundleManifest;
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
