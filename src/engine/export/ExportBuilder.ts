import JSZip from "jszip";
import type { WorldSpec } from "../quest/WorldSpec";
import { renderIndexHtml, renderRuntimeJs, renderSingleHtml } from "./StaticRuntimeTemplate";
import type { BundleManifest, ExportFileRole } from "./BundleManifest";
import { CertificationRunner } from "./certification/CertificationRunner";
import type { BrowserSmokeResult, CertifiedExportResult, ExportPackage } from "./certification/ExportHealthReport";
import { byteLength, hashString } from "./certification/checks/shared";
import { checkManifestCompatibility, checkRuntimeCompatibility } from "../version/Compatibility";
import { ENGINE_NAME, ENGINE_VERSION, EXPORT_FORMAT_VERSION, RUNTIME_VERSION } from "../version/EngineVersion";
import { CURRENT_RUNTIME_CONTRACT, getRequiredCapabilitySet } from "../version/RuntimeContract";
import { migrateWorldSpec, type MigrationResult } from "../version/migrations";

export type StaticExportFiles = {
  "index.html": string;
  "single.html": string;
  "runtime.js": string;
  "manifest.json": string;
  "quest-spec.json"?: string;
};

export interface BuildCertifiedOptions {
  smokeResult?: BrowserSmokeResult;
}

export class ExportBuilder {
  static buildFiles(world: WorldSpec): StaticExportFiles {
    return this.buildPackage(world).files;
  }

  static buildPackage(world: WorldSpec): ExportPackage {
    const migration = migrateWorldSpec(world);
    const preparedWorld = migration.migratedSpec;
    const compatibility = checkRuntimeCompatibility(preparedWorld, CURRENT_RUNTIME_CONTRACT);
    const runtime = renderRuntimeJs();
    const baseFiles: Omit<StaticExportFiles, "manifest.json"> = {
      "index.html": renderIndexHtml(preparedWorld),
      "single.html": renderSingleHtml(preparedWorld),
      "runtime.js": runtime,
    };
    const buildId = `build-${hashString(JSON.stringify(preparedWorld) + runtime + EXPORT_FORMAT_VERSION).replace("fnv1a-", "")}`;
    const createdAt = new Date().toISOString();

    if (preparedWorld.exportSettings.includeSourceSpec) {
      Object.assign(baseFiles, { "quest-spec.json": JSON.stringify(preparedWorld, null, 2) });
    }

    const manifest = this.manifest(preparedWorld, baseFiles, buildId, createdAt, compatibility, migration);
    const manifestCompatibility = checkManifestCompatibility(manifest, CURRENT_RUNTIME_CONTRACT);
    const finalCompatibility =
      compatibility.status === "incompatible" || manifestCompatibility.status === "incompatible"
        ? {
            status: "incompatible" as const,
            issues: [...compatibility.issues, ...manifestCompatibility.issues],
          }
        : compatibility.status === "warning" || manifestCompatibility.status === "warning"
          ? {
              status: "warning" as const,
              issues: [...compatibility.issues, ...manifestCompatibility.issues],
            }
          : {
              status: "compatible" as const,
              issues: [...compatibility.issues, ...manifestCompatibility.issues],
            };
    manifest.compatibility = finalCompatibility;

    const files: StaticExportFiles = {
      ...baseFiles,
      "manifest.json": JSON.stringify(manifest, null, 2),
    };

    return {
      buildId,
      createdAt,
      runtimeVersion: RUNTIME_VERSION,
      specVersion: preparedWorld.specVersion,
      exportFormatVersion: EXPORT_FORMAT_VERSION,
      files,
      manifest,
      compatibility: finalCompatibility,
      migration,
    };
  }

  static async buildCertified(world: WorldSpec, options: BuildCertifiedOptions = {}): Promise<CertifiedExportResult> {
    const exportPackage = this.buildPackage(world);
    const healthReport = CertificationRunner.run({
      world: exportPackage.migration.migratedSpec,
      files: exportPackage.files,
      manifest: exportPackage.manifest,
      buildId: exportPackage.buildId,
      createdAt: exportPackage.createdAt,
      compatibility: exportPackage.compatibility,
      migration: exportPackage.migration,
      smokeResult: options.smokeResult,
    });

    return {
      package: exportPackage,
      healthReport,
      canDownload: healthReport.overallStatus !== "fail",
    };
  }

  static async buildZip(world: WorldSpec) {
    const certified = await this.buildCertified(world);
    if (!certified.canDownload) {
      throw new Error("Export certification failed; ZIP generation is blocked.");
    }
    return this.buildZipFromPackage(certified.package);
  }

  static async buildZipFromPackage(exportPackage: ExportPackage) {
    const zip = new JSZip();
    Object.entries(exportPackage.files).forEach(([path, content]) => zip.file(path, content));
    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  }

  private static manifest(
    world: WorldSpec,
    files: Omit<StaticExportFiles, "manifest.json">,
    buildId: string,
    createdAt: string,
    compatibility: ExportPackage["compatibility"],
    migration: MigrationResult,
  ): BundleManifest {
    const manifestFiles = Object.entries(files).map(([path, content]) => ({
      path,
      bytes: byteLength(content),
      hash: hashString(content),
      role: fileRole(path),
    }));
    manifestFiles.push({ path: "manifest.json", bytes: 0, hash: "self", role: "manifest" });

    return {
      engine: ENGINE_NAME,
      engineVersion: ENGINE_VERSION,
      buildId,
      runtimeVersion: RUNTIME_VERSION,
      specVersion: world.specVersion,
      exportFormatVersion: EXPORT_FORMAT_VERSION,
      createdAt,
      sourceTemplateId: typeof world.metadata.template === "string" ? world.metadata.template : undefined,
      contract: CURRENT_RUNTIME_CONTRACT,
      compatibility,
      migration: {
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion,
        appliedMigrations: migration.appliedMigrations,
        warnings: migration.warnings,
      },
      files: manifestFiles,
      capabilities: {
        renderers: ["webgl2", "canvas2d"],
        fileMode: true,
        staticServer: true,
        embeddedQuestSpec: true,
        networkRequired: false,
      },
      capabilityIds: [...getRequiredCapabilitySet(CURRENT_RUNTIME_CONTRACT)],
      assets: world.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        embedded: asset.embedded,
        uri: asset.uri,
        bytes: asset.uri.startsWith("data:") ? byteLength(asset.uri) : undefined,
      })),
      minimumBrowserNotes: "Modern evergreen browser with WebGL2 or Canvas2D support. No network runtime is required.",
      standalone: true,
      requiresNetwork: false,
    };
  }
}

function fileRole(path: string): ExportFileRole {
  if (path === "index.html" || path === "single.html") {
    return "entry";
  }

  if (path === "runtime.js") {
    return "runtime";
  }

  if (path === "quest-spec.json") {
    return "spec";
  }

  if (path === "manifest.json") {
    return "manifest";
  }

  return "asset";
}
