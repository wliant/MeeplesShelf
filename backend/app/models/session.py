from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.game import Base

session_expansions = Table(
    "session_expansions",
    Base.metadata,
    Column("session_id", ForeignKey("game_sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("expansion_id", ForeignKey("expansions.id", ondelete="CASCADE"), primary_key=True),
)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Session enhancements
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_cooperative: Mapped[bool] = mapped_column(Boolean, server_default="false")
    cooperative_result: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    game: Mapped["Game"] = relationship(lazy="joined")
    players: Mapped[list["SessionPlayer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    expansions = relationship("Expansion", secondary=session_expansions, lazy="joined")
    photos: Mapped[list["SessionPhoto"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class SessionPlayer(Base):
    __tablename__ = "session_players"
    __table_args__ = (UniqueConstraint("session_id", "player_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE")
    )
    player_id: Mapped[int] = mapped_column(
        ForeignKey("players.id", ondelete="CASCADE")
    )
    score_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    total_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    winner: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["GameSession"] = relationship(back_populates="players")
    player: Mapped["Player"] = relationship(lazy="joined")


class SessionPhoto(Base):
    __tablename__ = "session_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE")
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session: Mapped["GameSession"] = relationship(back_populates="photos")


player_group_members = Table(
    "player_group_members",
    Base.metadata,
    Column("group_id", ForeignKey("player_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("player_id", ForeignKey("players.id", ondelete="CASCADE"), primary_key=True),
)


class PlayerGroup(Base):
    __tablename__ = "player_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    members = relationship("Player", secondary=player_group_members, lazy="joined")
