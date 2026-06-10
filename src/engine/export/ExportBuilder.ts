import JSZip from "jszip";
import type { WorldSpec } from "../quest/WorldSpec";
import { renderIndexHtml, renderRuntimeJs, renderSingleHtml } from "./StaticRuntimeTemplate";
import type { BundleManifest } from "./BundleManifest";
import { CertificationRunner, RUNTIME_VERSION } from "./certification/CertificationRunner";
import type { BrowserSmokeResult, CertifiedExportResult, ExportPackage } from "./certification/ExportHealthReport";
import { byteLength, hashString } from "./certification/checks/shared";

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
    const runtime = renderRuntimeJs();
    const baseFiles = {
      "index.html": renderIndexHtml(world),
      "single.html": renderSingleHtml(world),
      "runtime.js": runtime,
    };
    const buildId = `build-${hashString(JSON.stringify(world) + runtime).replace("fnv1a-", "")}`;
    const createdAt = new Date().toISOString();

    if (world.exportSettings.includeSourceSpec) {
      Object.assign(baseFiles, { "quest-spec.json": JSON.stringify(world, null, 2) });
    }

    const manifest = this.manifest(world, baseFiles, buildId, createdAt);
    const files: StaticExportFiles = {
      ...baseFiles,
      "manifest.json": JSON.stringify(manifest, null, 2),
    };

    return {
      buildId,
      createdAt,
      runtimeVersion: RUNTIME_VERSION,
      specVersion: world.version,
      files,
      manifest,
    };
  }

  static async buildCertified(world: WorldSpec, options: BuildCertifiedOptions = {}): Promise<CertifiedExportResult> {
    const exportPackage = this.buildPackage(world);
    const healthReport = CertificationRunner.run({
      world,
      files: exportPackage.files,
      manifest: exportPackage.manifest,
      buildId: exportPackage.buildId,
      createdAt: exportPackage.createdAt,
      smokeResult: options.smokeResult,
    });

    return {
      package: exportPackage,
      healthReport,
      canDownload: healthReport.overallStatus !== "fail",
    };
  }

  static async buildZip(world: WorldSpec) {
    return this.buildZipFromPackage(this.buildPackage(world));
  }

  static async buildZipFromPackage(exportPackage: ExportPackage) {
    const zip = new JSZip();
    Object.entries(exportPackage.files).forEach(([path, content]) => zip.file(path, content));
    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  }

  private static manifest(world: WorldSpec, files: Omit<StaticExportFiles, "manifest.json">, buildId: string, createdAt: string): BundleManifest {
    const manifestFiles = Object.entries(files).map(([path, content]) => ({
      path,
      bytes: byteLength(content),
      hash: hashString(content),
    }));
    manifestFiles.push({ path: "manifest.json", bytes: 0, hash: "self" });

    return {
      engine: "ai-quest-engine-3d-lite",
      buildId,
      runtimeVersion: RUNTIME_VERSION,
      specVersion: world.version,
      createdAt,
      files: manifestFiles,
      capabilities: {
        renderers: ["webgl2", "canvas2d"],
        fileMode: true,
        staticServer: true,
        embeddedQuestSpec: true,
        networkRequired: false,
      },
      assets: world.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        embedded: asset.embedded,
        uri: asset.uri,
      })),
      standalone: true,
      requiresNetwork: false,
    };
  }
}
