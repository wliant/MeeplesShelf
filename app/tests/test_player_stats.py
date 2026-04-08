from datetime import datetime, timezone

from app.schemas.player_stats import (
    PlayerGameBreakdown,
    PlayerProfileStats,
    PlayerRecentSession,
)
from app.schemas.stats import ActivityMonth


class TestPlayerProfileStatsSchema:
    _BASE = dict(
        player_id=1,
        player_name="Alice",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        sessions_played=5,
        wins=3,
        win_rate=0.6,
        favorite_game="Catan",
        games=[
            PlayerGameBreakdown(
                game_id=1,
                game_name="Catan",
                times_played=5,
                wins=3,
                win_rate=0.6,
                avg_score=42.5,
                best_score=55,
                last_played=datetime(2025, 6, 15, tzinfo=timezone.utc),
            ),
        ],
        recent_sessions=[
            PlayerRecentSession(
                session_id=1,
                game_id=1,
                game_name="Catan",
                played_at=datetime(2025, 6, 15, tzinfo=timezone.utc),
                total_score=55,
                winner=True,
            ),
        ],
        activity=[
            ActivityMonth(month="2025-06", session_count=1),
        ],
    )

    def test_full_profile_valid(self):
        stats = PlayerProfileStats(**self._BASE)
        assert stats.player_name == "Alice"
        assert stats.sessions_played == 5
        assert stats.wins == 3
        assert stats.win_rate == 0.6
        assert stats.favorite_game == "Catan"
        assert len(stats.games) == 1
        assert len(stats.recent_sessions) == 1
        assert len(stats.activity) == 1

    def test_zero_sessions_profile(self):
        stats = PlayerProfileStats(
            player_id=2,
            player_name="Bob",
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
            sessions_played=0,
            wins=0,
            win_rate=0.0,
            favorite_game=None,
            games=[],
            recent_sessions=[],
            activity=[ActivityMonth(month="2025-06", session_count=0)],
        )
        assert stats.sessions_played == 0
        assert stats.wins == 0
        assert stats.win_rate == 0.0
        assert stats.favorite_game is None
        assert stats.games == []
        assert stats.recent_sessions == []

    def test_favorite_game_none(self):
        stats = PlayerProfileStats(
            **{**self._BASE, "favorite_game": None, "games": []}
        )
        assert stats.favorite_game is None


class TestPlayerGameBreakdownSchema:
    def test_with_scores(self):
        g = PlayerGameBreakdown(
            game_id=1,
            game_name="Dominion",
            times_played=3,
            wins=1,
            win_rate=0.3333,
            avg_score=35.7,
            best_score=42,
            last_played=datetime(2025, 6, 1, tzinfo=timezone.utc),
        )
        assert g.avg_score == 35.7
        assert g.best_score == 42

    def test_with_null_scores(self):
        g = PlayerGameBreakdown(
            game_id=2,
            game_name="War Chest",
            times_played=2,
            wins=2,
            win_rate=1.0,
            avg_score=None,
            best_score=None,
            last_played=datetime(2025, 5, 1, tzinfo=timezone.utc),
        )
        assert g.avg_score is None
        assert g.best_score is None


class TestPlayerRecentSessionSchema:
    def test_winner_session(self):
        s = PlayerRecentSession(
            session_id=1,
            game_id=1,
            game_name="Catan",
            played_at=datetime(2025, 6, 15, tzinfo=timezone.utc),
            total_score=55,
            winner=True,
        )
        assert s.winner is True
        assert s.total_score == 55

    def test_loser_session_null_score(self):
        s = PlayerRecentSession(
            session_id=2,
            game_id=2,
            game_name="War Chest",
            played_at=datetime(2025, 6, 10, tzinfo=timezone.utc),
            total_score=None,
            winner=False,
        )
        assert s.winner is False
        assert s.total_score is None
