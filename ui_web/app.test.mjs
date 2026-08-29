import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatBarcodeDetails, getBarcodeDetails } from "./app.mjs";

const html = await readFile(new URL("index.html", import.meta.url), "utf8");

test("barcode field is empty by default and shows placeholder text", () => {
  const input = html.match(/<input\s+[^>]*id="barcode"[^>]*>/)?.[0];

  assert.ok(input, "barcode input should exist");
  assert.match(input, /placeholder="barcode"/);
  assert.doesNotMatch(input, /\svalue="[^"]+"/);
});

test("barcode details are requested from the core API", async () => {
  let requestedUrl;
  const result = await getBarcodeDetails(" 4006381333931 ", async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        barcode: "4006381333931",
        title: "Test Sample Product",
        description: "Test description for a sample product.",
        category: "Test Category",
      }),
    };
  });

  assert.equal(requestedUrl, "/api/details?barcode=4006381333931");
  assert.equal(result.title, "Test Sample Product");
  assert.equal(result.category, "Test Category");
});

test("a core API network failure has an actionable error", async () => {
  await assert.rejects(
    getBarcodeDetails("4006381333931", async () => { throw new TypeError("fetch failed"); }),
    /Confirm that the server is running/,
  );
});

test("submitting a sample barcode displays API JSON details", async () => {
  let submitHandler;
  const barcode = { value: "4006381333931" };
  const details = { value: "" };
  const submit = { disabled: false };
  const form = {
    addEventListener(eventName, handler) {
      assert.equal(eventName, "submit");
      submitHandler = handler;
    },
  };
  const elements = { "barcode-form": form, barcode, details, "get-details": submit };
  globalThis.document = {
    getElementById(id) {
      return elements[id];
    },
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      barcode: "4006381333931",
      title: "Test Sample Product",
      description: "Test description for a sample product.",
      category: "Test Category",
    }),
  });

  try {
    await import("./app.mjs?form-test");
    let defaultPrevented = false;
    await submitHandler({ preventDefault: () => { defaultPrevented = true; } });

    assert.equal(defaultPrevented, true);
    assert.deepEqual(JSON.parse(details.value), {
      barcode: "4006381333931",
      title: "Test Sample Product",
      description: "Test description for a sample product.",
      category: "Test Category",
    });
    assert.equal(submit.disabled, false);
  } finally {
    delete globalThis.document;
    delete globalThis.fetch;
  }
});

for (const scenario of [
  { barcode: "400638133393", code: "BARCODE_TOO_SHORT", query: "short-error-test" },
  { barcode: "40063813339310", code: "BARCODE_TOO_LONG", query: "long-error-test" },
]) {
  test(`${scenario.code} is displayed in the details field`, async () => {
    let submitHandler;
    const details = { value: "" };
    const submit = { disabled: false };
    const elements = {
      "barcode-form": { addEventListener: (_event, handler) => { submitHandler = handler; } },
      barcode: { value: scenario.barcode },
      details,
      "get-details": submit,
    };
    globalThis.document = { getElementById: (id) => elements[id] };
    globalThis.fetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({
        code: scenario.code,
        error: "Barcode must contain exactly 13 digits.",
      }),
    });

    try {
      await import(`./app.mjs?${scenario.query}`);
      await submitHandler({ preventDefault() {} });
      assert.deepEqual(JSON.parse(details.value), {
        status: "error",
        code: scenario.code,
        error: "Barcode must contain exactly 13 digits.",
      });
      assert.equal(submit.disabled, false);
    } finally {
      delete globalThis.document;
      delete globalThis.fetch;
    }
  });
}