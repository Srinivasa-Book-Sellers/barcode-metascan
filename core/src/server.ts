import "dotenv/config";
import cors from "cors";
import express from "express";
import { MemoryCache } from "./cache.js";
import { Resolver } from "./resolver.js";
import { BarcodeLookupProvider } from "./providers/barcode-lookup.js";
import { EanSearchProvider } from "./providers/ean-search.js";
import { GoogleBooksProvider } from "./providers/google-books.js";
import { OpenFoodFactsProvider } from "./providers/open-food-facts.js";
import { OpenLibraryProvider } from "./providers/open-library.js";

const port = Number(process.env.PORT ?? 3000);
const ttlHours = Number(process.env.CACHE_TTL_HOURS ?? 168);
const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173").split(",");
const resolver = new Resolver([
  new BarcodeLookupProvider(process.env.BARCODE_LOOKUP_API_KEY),
  new EanSearchProvider(process.env.EAN_SEARCH_TOKEN),
  new GoogleBooksProvider(process.env.GOOGLE_BOOKS_API_KEY),
  new OpenLibraryProvider(),
  new OpenFoodFactsProvider(),
], new MemoryCache(ttlHours * 60 * 60 * 1_000));

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "barcode-metascan", version: "0.1.0" });
});

app.get("/api/providers", (_request, response) => {
  response.json([
    { name: "Barcode Lookup", configured: Boolean(process.env.BARCODE_LOOKUP_API_KEY), kinds: ["product", "book"] },
    { name: "EAN-Search", configured: Boolean(process.env.EAN_SEARCH_TOKEN), kinds: ["product", "book"] },
    { name: "Google Books", configured: true, kinds: ["book"] },
    { name: "Open Library", configured: true, kinds: ["book"] },
    { name: "Open Food Facts", configured: true, kinds: ["product"] },
  ]);
});

app.get("/api/lookup/:barcode", async (request, response) => {
  try {
    response.json(await resolver.lookup(request.params.barcode));
  } catch (error) {
    response.status(400).json({
      code: "INVALID_BARCODE",
      message: error instanceof Error ? error.message : "Invalid barcode",
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Barcode MetaScan API listening on http://localhost:${port}`));
}
