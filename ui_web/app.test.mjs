import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatBarcodeDetails } from "./app.mjs";

const html = await readFile(new URL("index.html", import.meta.url), "utf8");

test("barcode field is empty by default and shows placeholder text", () => {
  const input = html.match(/<input\s+[^>]*id="barcode"[^>]*>/)?.[0];

  assert.ok(input, "barcode input should exist");
  assert.match(input, /placeholder="barcode"/);
  assert.doesNotMatch(input, /\svalue="[^"]+"/);
});

test("submitting a sample barcode displays it as JSON details", async () => {
  let submitHandler;
  const barcode = { value: "123456789" };
  const details = { value: "" };
  const form = {
    addEventListener(eventName, handler) {
      assert.equal(eventName, "submit");
      submitHandler = handler;
    },
  };
  const elements = { "barcode-form": form, barcode, details };
  globalThis.document = {
    getElementById(id) {
      return elements[id];
    },
  };

  try {
    await import("./app.mjs?form-test");
    let defaultPrevented = false;
    submitHandler({ preventDefault: () => { defaultPrevented = true; } });

    assert.equal(defaultPrevented, true);
    assert.deepEqual(JSON.parse(details.value), { barcode: "123456789" });
    assert.equal(details.value, formatBarcodeDetails("123456789"));
  } finally {
    delete globalThis.document;
  }
});