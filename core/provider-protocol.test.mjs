import assert from "node:assert/strict";
import test from "node:test";
import { createProvider, defineProvider } from "./provider-protocol.mjs";

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