from __future__ import annotations

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator

HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

from app.schemas.scoring import ScoringSpec

CollectionStatus = Literal[
    "owned",
    "wishlist",
    "want_to_play",
    "previously_owned",
    "want_to_trade",
    "for_trade",
    "preordered",
]

VALID_STATUSES = set(CollectionStatus.__args__)

GameType = Literal[
    "base_game",
    "expansion",
    "reimplementation",
    "standalone_expansion",
]

GameCondition = Literal[
    "new",
    "like_new",
    "good",
    "fair",
    "poor",
]


# --- Taxonomy schemas ---


class DesignerRead(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class PublisherRead(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class CategoryRead(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class MechanicRead(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


# --- Expansion schemas ---


class ExpansionCreate(BaseModel):
    name: str
    scoring_spec_patch: ScoringSpec | None = None


class ExpansionRead(BaseModel):
    id: int
    game_id: int
    name: str
    scoring_spec_patch: ScoringSpec | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Game schemas ---


class GameCreate(BaseModel):
    name: str
    min_players: int = 1
    max_players: int = 4
    scoring_spec: ScoringSpec | None = None

    # Metadata
    description: str | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    min_age: int | None = None
    weight: float | None = None
    year_published: int | None = None
    bgg_id: int | None = None
    user_rating: float | None = None

    # Classification
    game_type: GameType = "base_game"

    # Collection
    collection_status: CollectionStatus = "owned"
    is_favorite: bool = False

    # Collection details
    shelf_location: str | None = None
    acquisition_date: date | None = None
    acquisition_price: float | None = None
    condition: GameCondition | None = None
    lent_to: str | None = None

    # Relationships (names to get-or-create)
    designer_names: list[str] = []
    publisher_names: list[str] = []
    category_names: list[str] = []
    mechanic_names: list[str] = []

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be empty")
        return v.strip()

    @field_validator("min_players")
    @classmethod
    def min_players_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("min_players must be at least 1")
        return v

    @model_validator(mode="after")
    def max_gte_min(self):
        if self.max_players < self.min_players:
            raise ValueError("max_players must be >= min_players")
        return self


class GameUpdate(BaseModel):
    name: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    scoring_spec: ScoringSpec | None = None

    # Metadata
    description: str | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    min_age: int | None = None
    weight: float | None = None
    year_published: int | None = None
    bgg_id: int | None = None
    user_rating: float | None = None

    # Classification
    game_type: GameType | None = None

    # Collection
    collection_status: CollectionStatus | None = None
    is_favorite: bool | None = None

    # Collection details
    shelf_location: str | None = None
    acquisition_date: date | None = None
    acquisition_price: float | None = None
    condition: GameCondition | None = None
    lent_to: str | None = None

    # Relationships
    designer_names: list[str] | None = None
    publisher_names: list[str] | None = None
    category_names: list[str] | None = None
    mechanic_names: list[str] | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name must not be empty")
        return v.strip() if v else v

    @field_validator("min_players")
    @classmethod
    def min_players_positive(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("min_players must be at least 1")
        return v

    @model_validator(mode="after")
    def max_gte_min(self):
        if (
            self.min_players is not None
            and self.max_players is not None
            and self.max_players < self.min_players
        ):
            raise ValueError("max_players must be >= min_players")
        return self


class GameRead(BaseModel):
    id: int
    name: str
    min_players: int
    max_players: int
    scoring_spec: ScoringSpec | None = None
    created_at: datetime
    updated_at: datetime
    expansions: list[ExpansionRead] = []

    # Metadata
    description: str | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    min_age: int | None = None
    weight: float | None = None
    year_published: int | None = None
    bgg_id: int | None = None
    user_rating: float | None = None

    # Classification
    game_type: str = "base_game"

    # Collection
    collection_status: str = "owned"
    is_favorite: bool = False

    # Collection details
    shelf_location: str | None = None
    acquisition_date: date | None = None
    acquisition_price: float | None = None
    condition: str | None = None
    lent_to: str | None = None

    # Relationships
    designers: list[DesignerRead] = []
    publishers: list[PublisherRead] = []
    categories: list[CategoryRead] = []
    mechanics: list[MechanicRead] = []
    tags: list["GameTagRead"] = []

    model_config = {"from_attributes": True}


class GameBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class GameTagCreate(BaseModel):
    name: str
    color: str = "#666666"

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not HEX_COLOR_RE.match(v):
            raise ValueError("Color must be hex format (#RRGGBB)")
        return v


class GameTagRead(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class PaginatedGameResponse(BaseModel):
    items: list[GameRead]
    total: int
    offset: int
    limit: int
