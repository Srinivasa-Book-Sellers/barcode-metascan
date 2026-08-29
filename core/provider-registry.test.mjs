import assert from "node:assert/strict";
import test from "node:test";
import { defineProvider } from "./provider-protocol.mjs";
import { discoverProviders, registeredProviders } from "./provider-registry.mjs";

function definition(id, create = () => ({ lookup: async () => ({}) })) {
  return defineProvider({
    id,
    name: id.toUpperCase(),
    create,
  });
}

test("providers are automatically registered", () => {
  assert.deepEqual(registeredProviders.map(({ id }) => id), [
    "open-library",
    "open-products-facts",
    "test-search",
    "upcitemdb",
    "wikidata",
  ]);
  assert.ok(registeredProviders.every(({ lookup }) => typeof lookup === "function"));
});

test("discovery loads only files that follow the provider naming convention", async () => {
  const importedFiles = [];
  const providers = await discoverProviders({
    directoryUrl: new URL("file:///providers/"),
    readDirectory: async () => ["notes.mjs", "zeta.provider.mjs", "alpha.provider.mjs"],
    importProvider: async (url) => {
      importedFiles.push(url.pathname.split("/").at(-1));
      return { provider: definition(url.pathname.split("/").at(-1).split(".")[0]) };
    },
  });

  assert.deepEqual(importedFiles, ["alpha.provider.mjs", "zeta.provider.mjs"]);
  assert.deepEqual(providers.map(({ id }) => id), ["alpha", "zeta"]);
});

test("discovery rejects a provider without the required protocol export", async () => {
  await assert.rejects(
    discoverProviders({
      directoryUrl: new URL("file:///providers/"),
      readDirectory: async () => ["invalid.provider.mjs"],
      importProvider: async () => ({}),
    }),
    /Provider id must be a non-empty kebab-case string/,
  );
});

test("discovery rejects duplicate provider ids", async () => {
  await assert.rejects(
    discoverProviders({
      directoryUrl: new URL("file:///providers/"),
      readDirectory: async () => ["first.provider.mjs", "second.provider.mjs"],
      importProvider: async () => ({ provider: definition("duplicate") }),
    }),
    /Duplicate provider id "duplicate"/,
  );
});

test("discovery forwards provider-specific options to factories", async () => {
  let receivedOptions;
  const providers = await discoverProviders({
    directoryUrl: new URL("file:///providers/"),
    readDirectory: async () => ["configured.provider.mjs"],
    importProvider: async () => ({
      provider: definition("configured", (options) => {
        receivedOptions = options;
        return { lookup: async () => ({}) };
      }),
    }),
    providerOptions: { configured: { apiKey: "test-key", timeout: 5000 } },
  });

  assert.deepEqual(receivedOptions, { apiKey: "test-key", timeout: 5000 });
  assert.equal(providers[0].id, "configured");
});