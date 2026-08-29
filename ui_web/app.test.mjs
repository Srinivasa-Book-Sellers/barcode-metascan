import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatBarcodeDetails, getBarcodeDetails } from "./app.mjs";

const html = await readFile(new URL("index.html", import.meta.url), "utf8");

test("barcode field prompts the user to press Enter", () => {
  const input = html.match(/<input\s+[^>]*id="barcode"[^>]*>/)?.[0];

  assert.ok(input, "barcode input should exist");
  assert.match(input, /placeholder="Input barcode and press Enter to get details"/);
  assert.doesNotMatch(input, /\svalue="[^"]+"/);
});

test("the data source list contains only Test Search", () => {
  const select = html.match(/<select\s+[^>]*id="data-source"[^>]*>[\s\S]*?<\/select>/)?.[0];

  assert.ok(select, "data source select should exist");
  assert.match(select, /<option value="test-search">Test Search<\/option>/);
  assert.equal((select.match(/<option\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, />Get Details<\/button>/);
});

test("barcode details are requested from the core API", async () => {
  let requestedUrl;
  const result = await getBarcodeDetails(" 4006381333931 ", "test-search", async (url) => {
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

  assert.equal(requestedUrl, "/api/details?barcode=4006381333931&source=test-search");
  assert.equal(result.title, "Test Sample Product");
  assert.equal(result.category, "Test Category");
});

test("a core API network failure has an actionable error", async () => {
  await assert.rejects(
    getBarcodeDetails("4006381333931", "test-search", async () => { throw new TypeError("fetch failed"); }),
    /Confirm that the server is running/,
  );
});

test("submitting a sample barcode displays API JSON details", async () => {
  let submitHandler;
  const barcode = { value: "4006381333931" };
  const details = { value: "" };
  const dataSource = { value: "test-search", disabled: false };
  const form = {
    addEventListener(eventName, handler) {
      assert.equal(eventName, "submit");
      submitHandler = handler;
    },
  };
  const elements = { "barcode-form": form, barcode, details, "data-source": dataSource };
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
    assert.equal(dataSource.disabled, false);
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
    const dataSource = { value: "test-search", disabled: false };
    const elements = {
      "barcode-form": { addEventListener: (_event, handler) => { submitHandler = handler; } },
      barcode: { value: scenario.barcode },
      details,
      "data-source": dataSource,
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
      assert.equal(dataSource.disabled, false);
    } finally {
      delete globalThis.document;
      delete globalThis.fetch;
    }
  });
}