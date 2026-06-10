import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateFileMode(files: StaticExportFiles): ExportHealthCheck {
  const singleHtml = files["single.html"];
  const indexHtml = files["index.html"];
  const hasEmbeddedSpec = Boolean(indexHtml?.includes('id="quest-spec"') || singleHtml?.includes('id="quest-spec"'));
  const hasInlineRuntime = Boolean(singleHtml?.includes("__AQE_RUNTIME_READY__"));

  if (hasEmbeddedSpec && hasInlineRuntime) {
    return check("loads_from_file_possible", "Loads from file://", "pass", "Single HTML export embeds quest JSON and runtime code for file:// playback.");
  }

  if (hasEmbeddedSpec) {
    return check(
      "loads_from_file_possible",
      "Loads from file://",
      "warn",
      "Quest JSON is embedded, but runtime is split across files. Use ZIP/static server mode if browser file loading is restricted.",
    );
  }

  return check("loads_from_file_possible", "Loads from file://", "fail", "Quest JSON is not embedded. file:// playback would require blocked local fetches.");
}
