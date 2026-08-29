"""Policy-aware fallback for extracting product JSON-LD from candidate pages."""

from __future__ import annotations

import ipaddress
import json
import socket
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.robotparser import RobotFileParser


USER_AGENT = "barcode-metascan/0.1 (structured metadata fallback)"
MAX_PAGE_BYTES = 2_000_000
MAX_ROBOTS_BYTES = 512_000


class ScrapeError(RuntimeError):
    """Raised when a candidate page cannot be checked safely."""


class PublicHttpsRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        _validate_public_https_url(new_url)
        return super().redirect_request(request, file_pointer, code, message, headers, new_url)


@dataclass(frozen=True)
class ScrapedProduct:
    title: str
    source_url: str
    brand: str | None = None
    description: str | None = None
    category: str | None = None
    image_urls: tuple[str, ...] = ()


class JsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.documents: list[Any] = []
        self._collecting = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name.lower(): value for name, value in attrs}
        if tag.lower() == "script" and attributes.get("type", "").lower() == "application/ld+json":
            self._collecting = True
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._collecting:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "script" or not self._collecting:
            return
        self._collecting = False
        try:
            self.documents.append(json.loads("".join(self._parts)))
        except json.JSONDecodeError:
            pass
        self._parts = []


def _iter_objects(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, list):
        for item in value:
            yield from _iter_objects(item)
    elif isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if graph is not None:
            yield from _iter_objects(graph)


def _is_product(value: dict[str, Any]) -> bool:
    types = value.get("@type", [])
    if isinstance(types, str):
        types = [types]
    return any(str(item).rsplit("/", 1)[-1].lower() == "product" for item in types)


def _digits(value: Any) -> str:
    return "".join(character for character in str(value) if character.isdigit())


def _has_exact_identifier(product: dict[str, Any], barcode: str) -> bool:
    fields = ("gtin", "gtin8", "gtin12", "gtin13", "gtin14", "isbn", "productID")
    for field in fields:
        value = product.get(field)
        values = value if isinstance(value, list) else [value]
        if any(_digits(item) == barcode for item in values if item is not None):
            return True
    return False


def _text(value: Any) -> str | None:
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, dict):
        return _text(value.get("name"))
    if isinstance(value, list):
        return next((text for item in value if (text := _text(item))), None)
    return None


def _images(value: Any, page_url: str) -> tuple[str, ...]:
    values = value if isinstance(value, list) else [value]
    result: list[str] = []
    for item in values:
        image = item.get("contentUrl") or item.get("url") if isinstance(item, dict) else item
        if not isinstance(image, str):
            continue
        absolute = urljoin(page_url, image)
        if urlparse(absolute).scheme in {"http", "https"} and absolute not in result:
            result.append(absolute)
    return tuple(result)


def extract_product(html: str, barcode: str, page_url: str) -> ScrapedProduct | None:
    parser = JsonLdParser()
    parser.feed(html)
    for document in parser.documents:
        for product in _iter_objects(document):
            if not _is_product(product) or not _has_exact_identifier(product, barcode):
                continue
            title = _text(product.get("name"))
            if not title:
                continue
            return ScrapedProduct(
                title=title,
                source_url=page_url,
                brand=_text(product.get("brand") or product.get("manufacturer")),
                description=_text(product.get("description")),
                category=_text(product.get("category")),
                image_urls=_images(product.get("image"), page_url),
            )
    return None


def _validate_public_https_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ScrapeError("candidate URL must be public HTTPS without embedded credentials")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, 443)}
    except socket.gaierror as error:
        raise ScrapeError(f"cannot resolve candidate host: {error}") from error
    if not addresses:
        raise ScrapeError("candidate host did not resolve")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ScrapeError("candidate host resolves to a non-public address")


def _robots_allows(url: str, timeout: float) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    request = Request(robots_url, headers={"User-Agent": USER_AGENT, "Accept": "text/plain"})
    try:
        with build_opener(PublicHttpsRedirectHandler()).open(request, timeout=timeout) as response:
            content = response.read(MAX_ROBOTS_BYTES + 1)
    except HTTPError as error:
        if error.code == 404:
            return True
        raise ScrapeError(f"robots.txt returned HTTP {error.code}") from error
    except (URLError, TimeoutError) as error:
        raise ScrapeError(f"could not verify robots.txt: {error}") from error
    if len(content) > MAX_ROBOTS_BYTES:
        raise ScrapeError("robots.txt exceeded size limit")
    rules = RobotFileParser(robots_url)
    rules.parse(content.decode("utf-8", errors="replace").splitlines())
    return rules.can_fetch(USER_AGENT, url)


def scrape_candidate(url: str, barcode: str, timeout: float = 10.0) -> ScrapedProduct | None:
    _validate_public_https_url(url)
    if not _robots_allows(url, timeout):
        raise ScrapeError("robots.txt disallows this page")

    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    try:
        with build_opener(PublicHttpsRedirectHandler()).open(request, timeout=timeout) as response:
            content_type = response.headers.get_content_type()
            if content_type not in {"text/html", "application/xhtml+xml"}:
                raise ScrapeError(f"unsupported content type: {content_type}")
            content = response.read(MAX_PAGE_BYTES + 1)
            final_url = response.geturl()
            encoding = response.headers.get_content_charset() or "utf-8"
    except HTTPError as error:
        raise ScrapeError(f"page returned HTTP {error.code}") from error
    except (URLError, TimeoutError) as error:
        raise ScrapeError(f"could not fetch page: {error}") from error
    if len(content) > MAX_PAGE_BYTES:
        raise ScrapeError("page exceeded size limit")
    _validate_public_https_url(final_url)
    return extract_product(content.decode(encoding, errors="replace"), barcode, final_url)