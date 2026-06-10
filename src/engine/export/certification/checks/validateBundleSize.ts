import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { byteLength, check } from "./shared";

export function validateBundleSize(files: StaticExportFiles, warnBytes = 5 * 1024 * 1024, failBytes = 20 * 1024 * 1024): ExportHealthCheck {
  const fileSizes = Object.entries(files)
    .map(([path, content]) => ({ path, bytes: byteLength(content) }))
    .sort((a, b) => b.bytes - a.bytes);
  const totalBytes = fileSizes.reduce((sum, file) => sum + file.bytes, 0);
  const details = { totalBytes, warnBytes, failBytes, largestFiles: fileSizes.slice(0, 5) };

  if (totalBytes > failBytes) {
    return check("bundle_size_budget", "Bundle size budget", "fail", "Export package is over the hard 20 MB size budget.", details);
  }

  if (totalBytes > warnBytes) {
    return check("bundle_size_budget", "Bundle size budget", "warn", "Export package is over the recommended 5 MB size budget.", details);
  }

  return check("bundle_size_budget", "Bundle size budget", "pass", "Export package is within the recommended bundle size budget.", details);
}
