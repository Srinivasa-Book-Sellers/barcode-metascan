import { describe, expect, it } from "vitest";
import { MemoryCache } from "./cache.js";
import type { Provider } from "./providers/provider.js";
import { Resolver } from "./resolver.js";

const provider: Provider = {
  name: "Fixture Catalog",
  async lookup() {
    return {
      provider: "Fixture Catalog",
      state: "found",
      sourceUrl: "https://example.invalid/item",
      product: { title: "Sample notebook", brand: "Example" },
    };
  },
};

describe("Resolver", () => {
  it("merges provider data and caches successful lookups", async () => {
    const resolver = new Resolver([provider], new MemoryCache(60_000));
    const first = await resolver.lookup("012345678905");
    const second = await resolver.lookup("012345678905");
    expect(first.product.title).toBe("Sample notebook");
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
  });
});
