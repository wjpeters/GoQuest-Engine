import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check, findTerms } from "./shared";

const ABSOLUTE_LOCAL_TERMS = ["file://", "/Users/", "C:\\", "D:\\", "src=\"/", "href=\"/"];

export function validateStaticHosting(files: StaticExportFiles): ExportHealthCheck {
  const hasIndex = Boolean(files["index.html"]);
  const hasRuntime = Boolean(files["runtime.js"]);
  const absoluteMatches = findTerms(files, ABSOLUTE_LOCAL_TERMS);

  if (!hasIndex || !hasRuntime) {
    return check("loads_from_static_server", "Loads from static server", "fail", "Static export must include index.html and runtime.js.");
  }

  if (absoluteMatches.length > 0) {
    return check(
      "loads_from_static_server",
      "Loads from static server",
      "fail",
      "Export contains absolute local paths or root-relative paths that may break on generic static hosting.",
      absoluteMatches,
    );
  }

  return check("loads_from_static_server", "Loads from static server", "pass", "Package uses relative files and can be hosted on any static server.");
}
