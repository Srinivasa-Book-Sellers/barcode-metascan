"""Dependency-free prototype for resolving product metadata from a barcode."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from web_scrape_fallback import ScrapeError, scrape_candidate


USER_AGENT = "barcode-metascan/0.1 (metadata lookup prototype)"


class ProviderError(RuntimeError):
    """Raised when a provider cannot return a usable response."""


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    retrievedAt: str


@dataclass(frozen=True)
class ProductMetadata:
    schemaVersion: str
    barcode: str
    barcodeFormat: str
    resolvedAt: str
    title: str | None = None
    brand: str | None = None
    description: str | None = None
    category: str | None = None
    imageUrls: tuple[str, ...] = ()
    sources: tuple[Source, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["imageUrls"] = list(self.imageUrls)
        value["sources"] = [asdict(source) for source in self.sources]
        return {key: item for key, item in value.items() if item is not None}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_barcode(value: str) -> str:
    barcode = value.strip().replace("-", "").replace(" ", "")
    if not barcode.isdigit() or len(barcode) not in {8, 12, 13, 14}:
        raise ValueError("barcode must contain 8, 12, 13, or 14 digits")

    digits = [int(digit) for digit in barcode]
    weighted_sum = sum(
        digit * (3 if offset % 2 == 0 else 1)
        for offset, digit in enumerate(reversed(digits[:-1]))
    )
    expected_check_digit = (10 - weighted_sum % 10) % 10
    if expected_check_digit != digits[-1]:
        raise ValueError("barcode has an invalid GS1 check digit")
    return barcode


def barcode_format(barcode: str) -> str:
    return {8: "EAN_8", 12: "UPC_A", 13: "EAN_13", 14: "GTIN_14"}[len(barcode)]


def is_isbn13(barcode: str) -> bool:
    return len(barcode) == 13 and barcode.startswith(("978", "979"))


def get_json(url: str, timeout: float) -> dict[str, Any]:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as error:
        retry_after = error.headers.get("Retry-After")
        suffix = f"; retry after {retry_after}s" if retry_after else ""
        raise ProviderError(f"HTTP {error.code}{suffix}") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ProviderError(str(error)) from error


def google_books(barcode: str, timeout: float, api_key: str | None) -> ProductMetadata | None:
    parameters = {"q": f"isbn:{barcode}", "maxResults": "10"}
    if api_key:
        parameters["key"] = api_key
    url = f"https://www.googleapis.com/books/v1/volumes?{urlencode(parameters)}"
    payload = get_json(url, timeout)

    for item in payload.get("items", []):
        info = item.get("volumeInfo", {})
        identifiers = {
            str(identifier.get("identifier", ""))
            for identifier in info.get("industryIdentifiers", [])
        }
        if barcode not in identifiers:
            continue
        images = info.get("imageLinks", {})
        image = images.get("thumbnail") or images.get("smallThumbnail")
        return ProductMetadata(
            schemaVersion="1.0",
            barcode=barcode,
            barcodeFormat=barcode_format(barcode),
            title=info.get("title"),
            brand=info.get("publisher"),
            description=info.get("description"),
            category=next(iter(info.get("categories", [])), None),
            imageUrls=(image,) if image else (),
            sources=(Source("Google Books", item.get("selfLink", url), utc_now()),),
            resolvedAt=utc_now(),
        )
    return None


def open_library(barcode: str, timeout: float) -> ProductMetadata | None:
    parameters = {
        "isbn": barcode,
        "fields": "key,title,author_name,publisher,isbn,cover_i,subject",
        "limit": "10",
    }
    url = f"https://openlibrary.org/search.json?{urlencode(parameters)}"
    payload = get_json(url, timeout)

    for item in payload.get("docs", []):
        if barcode not in {str(identifier) for identifier in item.get("isbn", [])}:
            continue
        cover_id = item.get("cover_i")
        image = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
        publishers = item.get("publisher", [])
        subjects = item.get("subject", [])
        return ProductMetadata(
            schemaVersion="1.0",
            barcode=barcode,
            barcodeFormat=barcode_format(barcode),
            title=item.get("title"),
            brand=next(iter(publishers), None),
            category=next(iter(subjects), None),
            imageUrls=(image,) if image else (),
            sources=(Source("Open Library", f"https://openlibrary.org{item['key']}", utc_now()),),
            resolvedAt=utc_now(),
        )
    return None


def upcitemdb(barcode: str, timeout: float) -> ProductMetadata | None:
    url = f"https://api.upcitemdb.com/prod/trial/lookup?{urlencode({'upc': barcode})}"
    payload = get_json(url, timeout)

    for item in payload.get("items", []):
        identifiers = {str(item.get(field, "")) for field in ("ean", "upc", "gtin")}
        if barcode not in identifiers:
            continue
        images = tuple(image for image in item.get("images", []) if image)
        return ProductMetadata(
            schemaVersion="1.0",
            barcode=barcode,
            barcodeFormat=barcode_format(barcode),
            title=item.get("title"),
            brand=item.get("brand"),
            description=item.get("description"),
            category=item.get("category"),
            imageUrls=images,
            sources=(Source("UPCitemdb", url, utc_now()),),
            resolvedAt=utc_now(),
        )
    return None


def structured_web_page(barcode: str, url: str, timeout: float) -> ProductMetadata | None:
    scraped = scrape_candidate(url, barcode, timeout)
    if not scraped:
        return None
    return ProductMetadata(
        schemaVersion="1.0",
        barcode=barcode,
        barcodeFormat=barcode_format(barcode),
        title=scraped.title,
        brand=scraped.brand,
        description=scraped.description,
        category=scraped.category,
        imageUrls=scraped.image_urls,
        sources=(Source("Structured product page", scraped.source_url, utc_now()),),
        resolvedAt=utc_now(),
    )


def lookup(
    barcode_value: str,
    timeout: float = 10.0,
    candidate_urls: tuple[str, ...] = (),
) -> dict[str, Any]:
    barcode = normalize_barcode(barcode_value)
    attempts: list[dict[str, str]] = []
    providers = []
    if is_isbn13(barcode):
        providers.extend(
            [
                ("Google Books", lambda: google_books(barcode, timeout, os.getenv("GOOGLE_BOOKS_API_KEY"))),
                ("Open Library", lambda: open_library(barcode, timeout)),
            ]
        )
    providers.append(("UPCitemdb", lambda: upcitemdb(barcode, timeout)))
    for url in candidate_urls:
        host = urlparse(url).hostname or "invalid URL"
        providers.append(
            (
                f"Structured web ({host})",
                lambda candidate_url=url: structured_web_page(barcode, candidate_url, timeout),
            )
        )

    for name, provider in providers:
        try:
            product = provider()
        except (ProviderError, ScrapeError) as error:
            attempts.append({"provider": name, "outcome": "error", "detail": str(error)})
            continue
        if product:
            attempts.append({"provider": name, "outcome": "exact_match"})
            return {"product": product.to_dict(), "attempts": attempts}
        attempts.append({"provider": name, "outcome": "not_found"})

    unresolved = ProductMetadata(
        schemaVersion="1.0",
        barcode=barcode,
        barcodeFormat=barcode_format(barcode),
        resolvedAt=utc_now(),
    )
    return {"product": unresolved.to_dict(), "attempts": attempts}


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve barcodes to normalized product metadata")
    parser.add_argument("barcodes", nargs="+", help="EAN, UPC, GTIN, or ISBN-13 values")
    parser.add_argument("--timeout", type=float, default=10.0, help="per-provider timeout in seconds")
    parser.add_argument(
        "--candidate-url",
        action="append",
        default=[],
        help="public product page to check after API providers; may be repeated",
    )
    args = parser.parse_args()

    results = []
    exit_code = 0
    for value in args.barcodes:
        try:
            results.append(lookup(value, args.timeout, tuple(args.candidate_url)))
        except ValueError as error:
            results.append({"barcode": value, "error": str(error)})
            exit_code = 2
    json.dump(results, sys.stdout, indent=2, ensure_ascii=True)
    sys.stdout.write("\n")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())