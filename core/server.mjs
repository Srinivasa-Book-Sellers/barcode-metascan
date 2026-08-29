import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BarcodeLookup } from "./barcode-lookup.mjs";
import { registeredProviders } from "./provider-registry.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../ui_web");
const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.mjs", "app.mjs"],
]);
const contentTypes = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8" };

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

export function createRequestHandler({ providers } = {}) {
  const configuredProviders = providers ?? registeredProviders;
  const barcodeLookup = new BarcodeLookup({ providers: configuredProviders });

  return async function handleRequest(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/details") {
      const barcode = url.searchParams.get("barcode");
      try {
        const details = await barcodeLookup.lookup(barcode);
        sendJson(response, 200, details);
      } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 500;
        sendJson(response, status, {
          code: error?.code ?? "LOOKUP_FAILED",
          error: error instanceof Error ? error.message : "Lookup failed.",
        });
      }
      return;
    }

    const file = request.method === "GET" ? staticFiles.get(url.pathname) : undefined;
    if (!file) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    try {
      const body = await readFile(resolve(root, file));
      response.writeHead(200, { "content-type": contentTypes[extname(file)] });
      response.end(body);
    } catch {
      sendJson(response, 500, { error: "Web UI could not be loaded." });
    }
  };
}

export function startServer({ port = Number(process.env.PORT) || 8080, providers } = {}) {
  const server = createServer(createRequestHandler({ providers }));
  server.listen(port, () => console.log(`Barcode MetaScan: http://localhost:${port}`));
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startServer();
}