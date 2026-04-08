from pydantic import BaseModel


class BGGSearchResult(BaseModel):
    bgg_id: int
    name: str
    year_published: int | None = None


class BGGSearchResponse(BaseModel):
    results: list[BGGSearchResult]


class BGGGameDetail(BaseModel):
    bgg_id: int
    name: str
    year_published: int | None = None
    description: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    categories: list[str] = []
    mechanics: list[str] = []
