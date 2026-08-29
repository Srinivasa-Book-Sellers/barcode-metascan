import assert from "node:assert/strict";
import test from "node:test";
import { BarcodeLookup, BarcodeValidationError } from "./barcode-lookup.mjs";

test("a 13-digit barcode is passed to the configured provider", async () => {
  let receivedBarcode;
  const lookup = new BarcodeLookup({
    providers: [{ lookup: async (barcode) => {
      receivedBarcode = barcode;
      return { barcode };
    } }],
  });

  assert.deepEqual(await lookup.lookup(" 4006381333931 "), { barcode: "4006381333931" });
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