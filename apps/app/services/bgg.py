import asyncio
import html
import xml.etree.ElementTree as ET

import httpx

BGG_BASE = "https://boardgamegeek.com/xmlapi2"


async def search_bgg(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BGG_BASE}/search", params={"query": query, "type": "boardgame"}
        )
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    results = []
    for item in root.findall("item"):
        bgg_id = int(item.attrib.get("id", 0))
        name_el = item.find("name[@type='primary']")
        name = name_el.attrib.get("value", "") if name_el is not None else ""
        year_el = item.find("yearpublished")
        year = int(year_el.attrib["value"]) if year_el is not None else None
        results.append({"bgg_id": bgg_id, "name": name, "year_published": year})
    return results[:20]


async def get_bgg_details(bgg_id: int) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(4):
            resp = await client.get(
                f"{BGG_BASE}/thing",
                params={"id": str(bgg_id), "stats": "1"},
            )
            if resp.status_code == 202:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            resp.raise_for_status()
            break
        else:
            raise RuntimeError("BGG API returned 202 after retries")

    root = ET.fromstring(resp.text)
    item = root.find("item")
    if item is None:
        raise ValueError(f"No item found for BGG ID {bgg_id}")

    def attr(path: str, default: str = "") -> str:
        el = item.find(path)
        return el.attrib.get("value", default) if el is not None else default

    def int_attr(path: str) -> int | None:
        v = attr(path)
        return int(v) if v else None

    def float_attr(path: str) -> float | None:
        v = attr(path)
        return round(float(v), 2) if v else None

    desc_el = item.find("description")
    description = html.unescape(desc_el.text or "") if desc_el is not None else ""

    image = (item.find("image").text or "") if item.find("image") is not None else ""
    thumbnail = (
        (item.find("thumbnail").text or "")
        if item.find("thumbnail") is not None
        else ""
    )

    def links_of_type(link_type: str) -> list[str]:
        return [
            el.attrib.get("value", "")
            for el in item.findall(f"link[@type='{link_type}']")
        ]

    return {
        "bgg_id": bgg_id,
        "name": attr("name[@type='primary']"),
        "description": description[:5000],
        "image_url": image,
        "thumbnail_url": thumbnail,
        "min_players": int_attr("minplayers"),
        "max_players": int_attr("maxplayers"),
        "min_playtime": int_attr("minplaytime"),
        "max_playtime": int_attr("maxplaytime"),
        "year_published": int_attr("yearpublished"),
        "min_age": int_attr("minage"),
        "weight": float_attr("statistics/ratings/averageweight"),
        "categories": links_of_type("boardgamecategory"),
        "mechanics": links_of_type("boardgamemechanic"),
        "designers": links_of_type("boardgamedesigner"),
        "publishers": links_of_type("boardgamepublisher"),
    }
