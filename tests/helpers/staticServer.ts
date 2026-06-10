import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

export interface StaticServerHandle {
  origin: string;
  url: string;
  close: () => Promise<void>;
}

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function startStaticServer(rootDir: string): Promise<StaticServerHandle> {
  const root = resolve(rootDir);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const normalizedPath = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, "");
      const filePath = resolve(join(root, normalizedPath));

      if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const info = await stat(filePath);
      if (!info.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Static test server did not expose a TCP address.");
  }

  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    url: `${origin}/index.html`,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
          } else {
            resolveClose();
          }
        });
      }),
  };
}

function listen(server: Server) {
  return new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
}
