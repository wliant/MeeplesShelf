"""BoardGameGeek XML API v2 integration service."""

import asyncio
import html
import logging
import re
import time
import xml.etree.ElementTree as ET

import httpx

from app.config import settings
from app.schemas.bgg import BGGGameDetail, BGGSearchResult

logger = logging.getLogger(__name__)

_BGG_BASE = "https://boardgamegeek.com/xmlapi2"
_TIMEOUT = 10.0
_MIN_INTERVAL = 1.0  # seconds between BGG requests
_USER_AGENT = "MeeplesShelf/1.0"
_last_request_time: float = 0.0
_lock = asyncio.Lock()


class BGGNotConfiguredError(Exception):
    """Raised when BGG API token is not configured."""


def _bgg_headers() -> dict[str, str]:
    """Build headers for BGG API requests, including auth token if set."""
    headers: dict[str, str] = {"User-Agent": _USER_AGENT}
    if settings.bgg_api_token:
        headers["Authorization"] = f"Bearer {settings.bgg_api_token}"
    return headers


async def _throttled_get(url: str, params: dict) -> httpx.Response:
    """Make a GET request to BGG, respecting rate limits."""
    global _last_request_time
    if not settings.bgg_api_token:
        raise BGGNotConfiguredError(
            "BGG API token not configured. Set APP_BGG_API_TOKEN in your .env file. "
            "Register at https://boardgamegeek.com/using_the_xml_api to obtain a token."
        )
    async with _lock:
        elapsed = time.monotonic() - _last_request_time
        if elapsed < _MIN_INTERVAL:
            await asyncio.sleep(_MIN_INTERVAL - elapsed)
        async with httpx.AsyncClient(
            timeout=_TIMEOUT, headers=_bgg_headers()
        ) as client:
            response = await client.get(url, params=params)
        _last_request_time = time.monotonic()
    return response


def _strip_html(text: str | None) -> str | None:
    """Remove HTML tags and decode entities from BGG descriptions."""
    if not text:
        return None
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip() or None


def _parse_search_results(xml_bytes: bytes) -> list[BGGSearchResult]:
    """Parse BGG search XML into a list of search results."""
    root = ET.fromstring(xml_bytes)
    results = []
    for item in root.findall("item"):
        bgg_id = int(item.attrib["id"])
        name_el = item.find("name")
        name = name_el.attrib.get("value", "") if name_el is not None else ""
        year_el = item.find("yearpublished")
        year = int(year_el.attrib["value"]) if year_el is not None else None
        results.append(
            BGGSearchResult(bgg_id=bgg_id, name=name, year_published=year)
        )
    return results


def _parse_game_detail(xml_bytes: bytes) -> BGGGameDetail | None:
    """Parse BGG thing XML into a game detail object."""
    root = ET.fromstring(xml_bytes)
    item = root.find("item")
    if item is None:
        return None

    name_el = item.find("name[@type='primary']")
    name = name_el.attrib.get("value", "") if name_el is not None else ""
    year_el = item.find("yearpublished")
    desc_el = item.find("description")
    minp_el = item.find("minplayers")
    maxp_el = item.find("maxplayers")
    img_el = item.find("image")
    thumb_el = item.find("thumbnail")

    categories = [
        link.attrib["value"]
        for link in item.findall("link[@type='boardgamecategory']")
    ]
    mechanics = [
        link.attrib["value"]
        for link in item.findall("link[@type='boardgamemechanic']")
    ]

    return BGGGameDetail(
        bgg_id=int(item.attrib["id"]),
        name=name,
        year_published=int(year_el.attrib["value"]) if year_el is not None else None,
        description=_strip_html(desc_el.text if desc_el is not None else None),
        min_players=int(minp_el.attrib["value"]) if minp_el is not None else None,
        max_players=int(maxp_el.attrib["value"]) if maxp_el is not None else None,
        image_url=img_el.text.strip() if img_el is not None and img_el.text else None,
        thumbnail_url=thumb_el.text.strip() if thumb_el is not None and thumb_el.text else None,
        categories=categories,
        mechanics=mechanics,
    )


async def search_games(query: str) -> list[BGGSearchResult]:
    """Search BGG for board games matching the query string."""
    response = await _throttled_get(
        f"{_BGG_BASE}/search",
        {"query": query, "type": "boardgame"},
    )
    response.raise_for_status()
    return _parse_search_results(response.content)


async def get_game_details(bgg_id: int) -> BGGGameDetail | None:
    """Fetch detailed info for a single BGG game by ID."""
    response = await _throttled_get(
        f"{_BGG_BASE}/thing",
        {"id": str(bgg_id), "stats": "1"},
    )
    response.raise_for_status()
    return _parse_game_detail(response.content)


async def download_image(image_url: str) -> tuple[bytes, str]:
    """Download an image from a BGG URL. Returns (bytes, content_type)."""
    async with httpx.AsyncClient(
        timeout=_TIMEOUT, follow_redirects=True, headers=_bgg_headers()
    ) as client:
        response = await client.get(image_url)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "image/jpeg")
    if "png" in content_type:
        content_type = "image/png"
    elif "webp" in content_type:
        content_type = "image/webp"
    else:
        content_type = "image/jpeg"
    return response.content, content_type
