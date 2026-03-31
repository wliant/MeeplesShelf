from pydantic import BaseModel


class BGGSearchResult(BaseModel):
    bgg_id: int
    name: str
    year_published: int | None = None


class BGGGameDetails(BaseModel):
    bgg_id: int
    name: str
    description: str
    image_url: str
    thumbnail_url: str
    min_players: int | None
    max_players: int | None
    min_playtime: int | None
    max_playtime: int | None
    year_published: int | None
    min_age: int | None
    weight: float | None
    categories: list[str]
    mechanics: list[str]
    designers: list[str]
    publishers: list[str]


class BGGImportRequest(BaseModel):
    bgg_id: int
