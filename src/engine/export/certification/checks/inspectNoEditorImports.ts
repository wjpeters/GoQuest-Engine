import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check, findTerms } from "./shared";

const EDITOR_TERMS = ["editor/components", "Inspector", "JsonPanel", "ExportDialog", "/editor", "/api/", "React DevTools"];

export function inspectNoEditorImports(files: StaticExportFiles): ExportHealthCheck {
  const matches = findTerms(files, EDITOR_TERMS);

  if (matches.length === 0) {
    return check("no_editor_imports", "No editor imports", "pass", "Runtime files do not contain editor-only modules or routes.");
  }

  return check(
    "no_editor_imports",
    "No editor imports",
    "fail",
    "Export contains editor-only strings. Remove editor code from the runtime package.",
    matches,
  );
}
