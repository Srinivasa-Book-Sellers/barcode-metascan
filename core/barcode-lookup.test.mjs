import assert from "node:assert/strict";
import test from "node:test";
import { BarcodeLookup, BarcodeValidationError } from "./barcode-lookup.mjs";

function metadata(barcode, overrides = {}) {
  return {
    schemaVersion: "1.0",
    barcode,
    barcodeFormat: "EAN_13",
    resolvedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

test("a 13-digit barcode is passed to the configured provider", async () => {
  let receivedBarcode;
  const lookup = new BarcodeLookup({
    providers: [{ lookup: async (barcode) => {
      receivedBarcode = barcode;
      return metadata(barcode);
    } }],
  });

  assert.deepEqual(
    await lookup.lookup(" 4006381333931 "),
    metadata("4006381333931"),
  );
  assert.equal(receivedBarcode, "4006381333931");
});

for (const scenario of [
  { name: "short", barcode: "400638133393", code: "BARCODE_TOO_SHORT" },
  { name: "long", barcode: "40063813339310", code: "BARCODE_TOO_LONG" },
]) {
  test(`a ${scenario.name} barcode is rejected before calling a provider`, async () => {
    let providerCalled = false;
    const lookup = new BarcodeLookup({
      providers: [{ lookup: async () => { providerCalled = true; } }],
    });

    await assert.rejects(lookup.lookup(scenario.barcode), (error) => {
      assert.ok(error instanceof BarcodeValidationError);
      assert.equal(error.status, 422);
      assert.equal(error.code, scenario.code);
      return true;
    });
    assert.equal(providerCalled, false);
  });
}

test("non-numeric input has a format error code", async () => {
  const lookup = new BarcodeLookup({ providers: [{ lookup: async () => ({}) }] });
  await assert.rejects(lookup.lookup("40063813339AB"), (error) => {
    assert.equal(error.code, "BARCODE_INVALID_FORMAT");
    return true;
  });
});

test("providers must implement the lookup protocol", () => {
  assert.throws(
    () => new BarcodeLookup({ providers: [{}] }),
    /must implement lookup\(barcode\)/,
  );
});

test("provider responses must conform to the shared metadata contract", async () => {
  const lookup = new BarcodeLookup({
    providers: [{ id: "broken", lookup: async (barcode) => ({ barcode }) }],
  });

  await assert.rejects(lookup.lookup("4006381333931"), (error) => {
    assert.equal(error.code, "INVALID_PROVIDER_RESPONSE");
    assert.equal(error.status, 502);
    assert.match(error.message, /schemaVersion/);
    return true;
  });
});

test("a provider cannot return metadata for a different barcode", async () => {
  const lookup = new BarcodeLookup({
    providers: [{
      id: "wrong-barcode",
      lookup: async () => metadata("9780140449136"),
    }],
  });

  await assert.rejects(lookup.lookup("4006381333931"), /barcode must match/);
});