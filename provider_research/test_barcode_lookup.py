import unittest
from unittest.mock import patch

import barcode_lookup
import web_scrape_fallback


class BarcodeLookupTests(unittest.TestCase):
    def test_normalize_barcode_accepts_sample_and_rejects_bad_check_digit(self):
        self.assertEqual(barcode_lookup.normalize_barcode("8901860010432"), "8901860010432")

        with self.assertRaisesRegex(ValueError, "check digit"):
            barcode_lookup.normalize_barcode("8901860010433")

    @patch("barcode_lookup.get_json")
    def test_upcitemdb_ignores_nonmatching_batch_item(self, get_json):
        get_json.return_value = {
            "total": 1,
            "items": [{"ean": "9788184953671", "title": "A different item"}],
        }

        self.assertIsNone(barcode_lookup.upcitemdb("8901599152014", 1.0))

    @patch("barcode_lookup.get_json")
    def test_google_books_requires_exact_industry_identifier(self, get_json):
        get_json.return_value = {
            "items": [
                {
                    "selfLink": "https://example.invalid/volume",
                    "volumeInfo": {
                        "title": "Nearby search result",
                        "industryIdentifiers": [
                            {"type": "ISBN_13", "identifier": "9789361059538"}
                        ],
                    },
                }
            ]
        }

        self.assertIsNone(barcode_lookup.google_books("9789361059537", 1.0, None))

    @patch("barcode_lookup.upcitemdb")
    @patch("barcode_lookup.open_library")
    @patch("barcode_lookup.google_books")
    def test_lookup_continues_after_provider_error(
        self, google_books, open_library, upcitemdb
    ):
        google_books.side_effect = barcode_lookup.ProviderError("HTTP 429")
        open_library.return_value = None
        upcitemdb.return_value = barcode_lookup.ProductMetadata(
            schemaVersion="1.0",
            barcode="9788184953671",
            barcodeFormat="EAN_13",
            title="Vedic Mathematics Made Easy-telegu",
            resolvedAt="2026-08-29T00:00:00Z",
        )

        result = barcode_lookup.lookup("9788184953671")

        self.assertEqual(result["product"]["title"], "Vedic Mathematics Made Easy-telegu")
        self.assertEqual(
            [attempt["outcome"] for attempt in result["attempts"]],
            ["error", "not_found", "exact_match"],
        )

    def test_structured_page_requires_exact_gtin(self):
        html = """
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {"@type": "Product", "gtin13": "8901860010431", "name": "Nearby item"},
            {
              "@type": "Product",
              "gtin13": "8901860010432",
              "name": "Flex Kwik Instant Adhesive",
              "brand": {"@type": "Brand", "name": "Pidilite"},
              "description": "Instant adhesive",
              "category": "Art & Crafting Tools",
              "image": ["/images/front.jpg"]
            }
          ]
        }
        </script>
        """

        product = web_scrape_fallback.extract_product(
            html, "8901860010432", "https://shop.example/product"
        )

        self.assertIsNotNone(product)
        self.assertEqual(product.title, "Flex Kwik Instant Adhesive")
        self.assertEqual(product.brand, "Pidilite")
        self.assertEqual(product.category, "Art & Crafting Tools")
        self.assertEqual(product.image_urls, ("https://shop.example/images/front.jpg",))

    def test_structured_page_rejects_nearby_identifier(self):
        html = """
        <script type="application/ld+json">
        {"@type": "Product", "gtin13": "8901860010431", "name": "Nearby item"}
        </script>
        """

        self.assertIsNone(
            web_scrape_fallback.extract_product(
                html, "8901860010432", "https://shop.example/product"
            )
        )

    @patch("barcode_lookup.scrape_candidate")
    @patch("barcode_lookup.upcitemdb")
    def test_lookup_uses_structured_page_after_api_miss(self, upcitemdb, scrape_candidate):
        upcitemdb.return_value = None
        scrape_candidate.return_value = web_scrape_fallback.ScrapedProduct(
            title="Flex Kwik Instant Adhesive",
            brand="Pidilite",
            source_url="https://shop.example/product",
        )

        result = barcode_lookup.lookup(
            "8901860010432", candidate_urls=("https://shop.example/product",)
        )

        self.assertEqual(result["product"]["title"], "Flex Kwik Instant Adhesive")
        self.assertEqual(
            [attempt["outcome"] for attempt in result["attempts"]],
            ["not_found", "exact_match"],
        )


if __name__ == "__main__":
    unittest.main()