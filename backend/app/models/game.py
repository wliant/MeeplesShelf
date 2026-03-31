from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# --- Association tables ---

game_designers = Table(
    "game_designers",
    Base.metadata,
    Column(
        "game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "designer_id",
        ForeignKey("designers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

game_publishers = Table(
    "game_publishers",
    Base.metadata,
    Column(
        "game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "publisher_id",
        ForeignKey("publishers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

game_categories = Table(
    "game_categories",
    Base.metadata,
    Column(
        "game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "category_id",
        ForeignKey("categories.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

game_mechanics = Table(
    "game_mechanics",
    Base.metadata,
    Column(
        "game_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "mechanic_id",
        ForeignKey("mechanics.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# --- Taxonomy models ---


class Designer(Base):
    __tablename__ = "designers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    bgg_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Publisher(Base):
    __tablename__ = "publishers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    bgg_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    bgg_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Mechanic(Base):
    __tablename__ = "mechanics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    bgg_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


# --- Core models ---


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    min_players: Mapped[int] = mapped_column(Integer, default=1)
    max_players: Mapped[int] = mapped_column(Integer, default=4)
    scoring_spec: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Metadata
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    min_playtime: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_playtime: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    year_published: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bgg_id: Mapped[int | None] = mapped_column(Integer, nullable=True, unique=True)
    user_rating: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Collection
    collection_status: Mapped[str] = mapped_column(
        String(20), server_default="owned"
    )
    is_favorite: Mapped[bool] = mapped_column(Boolean, server_default="false")

    # Relationships
    expansions: Mapped[list["Expansion"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )
    designers = relationship("Designer", secondary=game_designers, lazy="joined")
    publishers = relationship("Publisher", secondary=game_publishers, lazy="joined")
    categories = relationship("Category", secondary=game_categories, lazy="joined")
    mechanics = relationship("Mechanic", secondary=game_mechanics, lazy="joined")


class Expansion(Base):
    __tablename__ = "expansions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scoring_spec_patch: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    game: Mapped["Game"] = relationship(back_populates="expansions")
