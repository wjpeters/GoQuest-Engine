import type { ExportHealthCheck, ExportHealthStatus } from "../ExportHealthReport";

export function check(
  id: string,
  label: string,
  status: ExportHealthStatus,
  message: string,
  details?: unknown,
): ExportHealthCheck {
  return { id, label, status, message, details };
}

export function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function findTerms(files: Record<string, string | undefined>, terms: string[]) {
  const matches: Array<{ file: string; term: string }> = [];
  Object.entries(files).forEach(([file, content]) => {
    if (!content) {
      return;
    }

    terms.forEach((term) => {
      if (content.includes(term)) {
        matches.push({ file, term });
      }
    });
  });
  return matches;
}
