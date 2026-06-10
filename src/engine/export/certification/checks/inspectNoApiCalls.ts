import type { StaticExportFiles } from "../../ExportBuilder";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check, findTerms } from "./shared";

const HARD_TERMS = ["/api/", "XMLHttpRequest", "WebSocket(", "EventSource(", "localhost:", "127.0.0.1:"];
const FETCH_TERM = "fetch(";

export function inspectNoApiCalls(files: StaticExportFiles): ExportHealthCheck {
  const hardMatches = findTerms(files, HARD_TERMS);
  const fetchMatches = findTerms(files, [FETCH_TERM]);

  if (hardMatches.length > 0) {
    return check(
      "no_api_calls",
      "No API calls",
      "fail",
      "Export contains backend/API call markers. Standalone runtime must not call app services.",
      hardMatches,
    );
  }

  if (fetchMatches.length > 0) {
    return check(
      "no_api_calls",
      "No API calls",
      "warn",
      "Export contains fetch usage. Verify it only loads relative local assets.",
      fetchMatches,
    );
  }

  return check("no_api_calls", "No API calls", "pass", "Runtime does not contain fetch, XHR, WebSocket, EventSource or app API markers.");
}
