import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BundleManifest } from "../../src/engine/export/BundleManifest";
import { ExportBuilder } from "../../src/engine/export/ExportBuilder";
import type { ExportHealthReport } from "../../src/engine/export/certification/ExportHealthReport";
import type { WorldSpec } from "../../src/engine/quest/WorldSpec";
import { templates } from "../../src/templates";

export interface BuiltTemplateExport {
  template: WorldSpec;
  outDir: string;
  healthReport: ExportHealthReport;
  manifest: BundleManifest;
  files: string[];
  cleanup: () => Promise<void>;
}

export async function buildTemplateExport(templateId: string): Promise<BuiltTemplateExport> {
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    throw new Error(`Unknown template id: ${templateId}`);
  }

  const outDir = await mkdtemp(join(tmpdir(), `aqe-export-${templateId}-`));
  const certified = await ExportBuilder.buildCertified(template);
  const entries = Object.entries(certified.package.files);

  await Promise.all(entries.map(([path, content]) => writeFile(join(outDir, path), content, "utf8")));

  return {
    template,
    outDir,
    healthReport: certified.healthReport,
    manifest: certified.package.manifest,
    files: entries.map(([path]) => path),
    cleanup: () => rm(outDir, { recursive: true, force: true }),
  };
}

export const templateSmokeMatrix = templates.map((template) => ({
  id: template.id,
  title: template.title,
}));
