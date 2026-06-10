import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateRuntimeCapabilities(files: StaticExportFiles): ExportHealthCheck {
  const runtime = `${files["runtime.js"] ?? ""}\n${files["single.html"] ?? ""}`;
  const hasWebGpuOnly = runtime.includes("getContext(\"webgpu\")") && !runtime.includes("webgl2") && !runtime.includes("2d");
  const hasWebGl = runtime.includes("webgl2");
  const hasCanvasFallback = runtime.includes("canvas2d") || runtime.includes("getContext(\"2d\")");

  if (hasWebGpuOnly) {
    return check("works_without_webgpu", "Works without WebGPU", "fail", "Runtime appears to require WebGPU without fallback.");
  }

  if (hasWebGl || hasCanvasFallback) {
    return check(
      "works_without_webgpu",
      "Works without WebGPU",
      "pass",
      hasCanvasFallback ? "Runtime has WebGL2 and Canvas2D fallback paths." : "Runtime uses WebGL2 and does not require WebGPU.",
    );
  }

  return check("works_without_webgpu", "Works without WebGPU", "fail", "Runtime renderer capability could not be detected.");
}
