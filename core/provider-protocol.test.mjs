import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProviderResponse,
  createProvider,
  defineProvider,
} from "./provider-protocol.mjs";

test("provider definitions require a stable custom id", () => {
  assert.throws(
    () => defineProvider({ id: "Class Name", name: "Example", create: () => ({}) }),
    /kebab-case/,
  );
});

test("provider factories must create an object with lookup", () => {
  const definition = defineProvider({
    id: "invalid-factory",
    name: "Invalid Factory",
    create: () => ({}),
  });

  assert.throws(() => createProvider(definition), /must implement lookup\(barcode\)/);
});

test("registered providers receive their declared identity", () => {
  const provider = createProvider(defineProvider({
    id: "example",
    name: "Example API",
    create: () => ({ lookup: async () => ({}) }),
  }));

  assert.equal(provider.id, "example");
  assert.equal(provider.name, "Example API");
});

test("provider response timestamps must use ISO 8601 UTC format", () => {
  assert.throws(
    () => assertProviderResponse({
      schemaVersion: "1.0",
      barcode: "4006381333931",
      barcodeFormat: "EAN_13",
      resolvedAt: "Sat, 29 Aug 2026 00:00:00 GMT",
    }, { barcode: "4006381333931", providerId: "example" }),
    /resolvedAt must be an ISO date string/,
  );
});

test("provider response timestamps may omit milliseconds", () => {
  const response = {
    schemaVersion: "1.0",
    barcode: "4006381333931",
    barcodeFormat: "EAN_13",
    resolvedAt: "2026-08-29T00:00:00Z",
  };

  assert.equal(
    assertProviderResponse(response, { barcode: response.barcode, providerId: "example" }),
    response,
  );
});