import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check, findTerms } from "./shared";

const NETWORK_TERMS = [
  "http://",
  "https://",
  "src=\"//",
  "href=\"//",
  "url(//",
  "fonts.googleapis",
  "googletagmanager",
  "analytics",
  "webhook",
];

export function inspectNoExternalNetwork(files: StaticExportFiles): ExportHealthCheck {
  const matches = findTerms(files, NETWORK_TERMS);

  if (matches.length === 0) {
    return check("no_external_network_requests", "No external network requests", "pass", "Export has zero external runtime dependencies.");
  }

  return check(
    "no_external_network_requests",
    "No external network requests",
    "fail",
    "Export references external network resources. Remove external scripts, fonts, images, analytics or webhooks.",
    matches,
  );
}
