import type { Page, Request } from "@playwright/test";

export interface NetworkGuard {
  violations: string[];
  dispose: () => void;
}

export function attachNetworkGuard(page: Page, allowedOrigin?: string): NetworkGuard {
  const violations: string[] = [];
  const onRequest = (request: Request) => {
    const url = request.url();
    if (!isAllowedRequest(url, allowedOrigin)) {
      violations.push(url);
    }
  };

  page.on("request", onRequest);

  return {
    violations,
    dispose: () => page.off("request", onRequest),
  };
}

function isAllowedRequest(url: string, allowedOrigin?: string) {
  if (url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("file:")) {
    return true;
  }

  if (url.includes("/api/") || url.includes("/editor") || url.includes("analytics") || url.includes("googletagmanager")) {
    return false;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  const parsed = new URL(url);
  const isLocalHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  const isAllowedOrigin = allowedOrigin ? parsed.origin === allowedOrigin : isLocalHost;

  return isLocalHost && isAllowedOrigin;
}
