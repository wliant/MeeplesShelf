"""Unit tests for BGG Pydantic schemas."""

from app.schemas.bgg import BGGGameDetail, BGGSearchResponse, BGGSearchResult


class TestBGGSearchResult:
    def test_valid_result(self):
        r = BGGSearchResult(bgg_id=13, name="Catan", year_published=1995)
        assert r.bgg_id == 13
        assert r.name == "Catan"
        assert r.year_published == 1995

    def test_no_year(self):
        r = BGGSearchResult(bgg_id=13, name="Catan")
        assert r.year_published is None


class TestBGGSearchResponse:
    def test_empty_results(self):
        resp = BGGSearchResponse(results=[])
        assert resp.results == []

    def test_with_results(self):
        resp = BGGSearchResponse(
            results=[
                BGGSearchResult(bgg_id=13, name="Catan"),
                BGGSearchResult(bgg_id=42, name="Catan Junior", year_published=2012),
            ]
        )
        assert len(resp.results) == 2


class TestBGGGameDetail:
    def test_full_detail(self):
        d = BGGGameDetail(
            bgg_id=13,
            name="Catan",
            min_players=3,
            max_players=4,
            categories=["Economic"],
            mechanics=["Dice Rolling"],
        )
        assert d.bgg_id == 13
        assert d.categories == ["Economic"]

    def test_defaults(self):
        d = BGGGameDetail(bgg_id=99, name="Minimal")
        assert d.year_published is None
        assert d.description is None
        assert d.min_players is None
        assert d.max_players is None
        assert d.image_url is None
        assert d.thumbnail_url is None
        assert d.categories == []
        assert d.mechanics == []
