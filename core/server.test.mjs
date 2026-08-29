import assert from "node:assert/strict";
import test from "node:test";
import { createRequestHandler } from "./server.mjs";

function createResponse() {
  return {
    status: undefined,
    body: undefined,
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.body = body;
    },
  };
}

function metadata(barcode) {
  return {
    schemaVersion: "1.0",
    barcode,
    barcodeFormat: "EAN_13",
    resolvedAt: "2026-08-29T00:00:00Z",
  };
}

test("explicit providers bypass default provider discovery", async () => {
  let discoveryCalled = false;
  const handler = createRequestHandler({
    providers: [{ id: "explicit", lookup: async (barcode) => metadata(barcode) }],
    loadProviders: async () => {
      discoveryCalled = true;
      throw new Error("Default discovery should not run.");
    },
  });
  const response = createResponse();

  await handler({ method: "GET", url: "/api/details?barcode=4006381333931" }, response);

  assert.equal(discoveryCalled, false);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), metadata("4006381333931"));
});

test("default provider discovery waits until an API lookup", async () => {
  let discoveryCalled = false;
  const handler = createRequestHandler({
    loadProviders: async () => {
      discoveryCalled = true;
      return [{ id: "default", lookup: async (barcode) => metadata(barcode) }];
    },
  });
  const response = createResponse();

  await handler({ method: "GET", url: "/missing" }, response);
  assert.equal(discoveryCalled, false);

  await handler({ method: "GET", url: "/api/details?barcode=4006381333931" }, createResponse());
  assert.equal(discoveryCalled, true);
});
