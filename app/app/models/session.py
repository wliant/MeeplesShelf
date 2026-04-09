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


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sealed: Mapped[bool] = mapped_column(Boolean, default=False)
    sealed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    game: Mapped["Game"] = relationship(lazy="joined")
    players: Mapped[list["SessionPlayer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    expansions = relationship("Expansion", secondary=session_expansions, lazy="joined")
    images: Mapped[list["SessionImage"]] = relationship(
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
    reactions: Mapped[list["ScoreReaction"]] = relationship(
        back_populates="session_player", cascade="all, delete-orphan"
    )


class SessionImage(Base):
    __tablename__ = "session_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE")
    )
    player_id: Mapped[int | None] = mapped_column(
        ForeignKey("players.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session: Mapped["GameSession"] = relationship(back_populates="images")
    player: Mapped["Player | None"] = relationship(lazy="joined")


class ScoreReaction(Base):
    __tablename__ = "score_reactions"
    __table_args__ = (
        UniqueConstraint("session_player_id", "player_id", name="uq_score_reactions_sp_player"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_player_id: Mapped[int] = mapped_column(
        ForeignKey("session_players.id", ondelete="CASCADE")
    )
    player_id: Mapped[int] = mapped_column(
        ForeignKey("players.id", ondelete="CASCADE")
    )
    reaction: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session_player: Mapped["SessionPlayer"] = relationship(back_populates="reactions")
    player: Mapped["Player"] = relationship(lazy="joined")
