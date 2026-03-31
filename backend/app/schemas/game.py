from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator

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

    # Collection
    collection_status: CollectionStatus = "owned"
    is_favorite: bool = False

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

    # Collection
    collection_status: CollectionStatus | None = None
    is_favorite: bool | None = None

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

    # Collection
    collection_status: str = "owned"
    is_favorite: bool = False

    # Relationships
    designers: list[DesignerRead] = []
    publishers: list[PublisherRead] = []
    categories: list[CategoryRead] = []
    mechanics: list[MechanicRead] = []

    model_config = {"from_attributes": True}


class GameBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
