# Metadata Source Testing

`barcode-metascan` targets stationery and books. Before implementing a provider, test representative local products in each source to confirm that its records include the metadata required for a useful scan result: title, brand or publisher, category, cover image, and product identifier.

## 1. Stationery Barcode Portals

Use these portals to test Indian stationery barcodes without writing backend code. Try 5–10 products, such as Doms pencil boxes, Classmate notebooks, and locally sold gel pens, and record whether the source recognizes the barcode and returns an accurate description, category, and image.

* [EAN-Search Live Look-up](https://www.ean-search.org/): Go directly to their homepage. They have a massive search bar right at the top. Grab 5–10 random stationery items from your shop (like a Doms pencil box, a Classmate notebook, and a local gel pen), type the 13-digit barcode number into the search bar, and hit enter. You will immediately see if their database contains the exact text description, category, and image.
* [Barcode Lookup Search Bar](https://www.barcodelookup.com/): Their main consumer-facing website acts as a live frontend test portal for their API. Paste your barcode into their main search engine. If the product shows up on the website with an image and details, it means it is fully available in their developer JSON API database.

### GS1 India DataKart Portal

[GS1 India DataKart](https://www.gs1india.org/datakart/datakart-for-retailers) is the preferred official portal to evaluate for products registered by Indian brand owners. It is especially relevant for Indian stationery because GTINs beginning with the `890` GS1 India prefix are common in this catalogue.

* Access requires signup or an appropriate retailer account.
* Search representative `890`-prefixed GTINs and compare the returned product name, brand, category, pack size, and image with the physical item.
* Treat DataKart access and usage terms as a provider constraint; confirm the supported integration method, rate limits, and permitted storage of returned metadata before adding an adapter.

## 2. Book Metadata: Google Books API

[Google Books API](https://developers.google.com/books/docs/v1/using) is the primary public metadata source to evaluate for books. Query it with an ISBN-10 or ISBN-13 after scanning a book barcode and use the best matching volume to enrich the shared product record.

Useful Google Books fields include the title, authors, publisher, published date, description, categories, page count, language, thumbnail, and industry identifiers. Use `volumeInfo.industryIdentifiers` to verify that the returned volume contains the scanned ISBN; do not assume that the first search result is an exact match.

Example ISBN lookup:

```text
GET https://www.googleapis.com/books/v1/volumes?q=isbn:9780140449136
```

Record whether the response has an exact ISBN match, a usable cover image, and enough bibliographic fields for the intended exporter. The API may require a key for production usage; follow its quota and attribution requirements when implementing the provider.

## 3. Testing via Postman or Web Browser
If you want to see the exact structure of the JSON payload without setting up a coding environment, you can use Postman, Insomnia, or even your standard web browser:

* EAN-Search API Test Tool: They provide a free API key upon registering a basic account. Once logged in, they have a [Web API Sandbox Page](https://www.ean-search.org/ean-database-api.html) where you can punch in a barcode right in your browser and instantly inspect the raw JSON array response.
* Barcode Lookup API Playground: Once you create a free developer trial account, your dashboard gives you access to a Live API Explorer. It lets you toggle parameters (like barcode, mpn, or search term) and click "Send Request" to preview the network payload response layout.

------------------------------
## What to Look Out For During Your Test

1. **GS1 India prefix test:** For stationery barcodes that begin with `890`, measure how often each source returns a correct match and whether the metadata is current.
2. **ISBN verification:** For books, make sure the API response contains the exact scanned ISBN before using its metadata.
3. **Image availability:** Check whether each source includes a clean, usable image URL. A missing image requires a fallback strategy.
4. **Field completeness:** Compare the title, brand or publisher, category, and pack size or edition against the physical product.
5. **Provider constraints:** Record authentication requirements, quotas, response latency, and terms for caching or exporting data.
