import JSZip from "jszip";
import type { WorldSpec } from "../quest/WorldSpec";
import { renderIndexHtml, renderRuntimeJs } from "./StaticRuntimeTemplate";
import type { BundleManifest } from "./BundleManifest";

export interface StaticExportFiles {
  "index.html": string;
  "runtime.js": string;
  "manifest.json": string;
  "quest-spec.json"?: string;
}

export class ExportBuilder {
  static buildFiles(world: WorldSpec): StaticExportFiles {
    const files: StaticExportFiles = {
      "index.html": renderIndexHtml(world),
      "runtime.js": renderRuntimeJs(),
      "manifest.json": JSON.stringify(this.manifest(world), null, 2),
    };

    if (world.exportSettings.includeSourceSpec) {
      files["quest-spec.json"] = JSON.stringify(world, null, 2);
    }

    return files;
  }

  static async buildZip(world: WorldSpec) {
    const zip = new JSZip();
    const files = this.buildFiles(world);
    Object.entries(files).forEach(([path, content]) => zip.file(path, content));
    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  }

  private static manifest(world: WorldSpec): BundleManifest {
    const files = ["index.html", "runtime.js", "manifest.json"];
    if (world.exportSettings.includeSourceSpec) {
      files.push("quest-spec.json");
    }

    return {
      engine: "ai-quest-engine-3d-lite",
      runtimeVersion: world.version,
      createdAt: new Date().toISOString(),
      files,
      standalone: true,
      requiresNetwork: false,
    };
  }
}
