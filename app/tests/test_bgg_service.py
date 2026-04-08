"""Unit tests for BGG service — XML parsing and utility functions."""

from app.services.bgg import _parse_game_detail, _parse_search_results, _strip_html


class TestStripHtml:
    def test_removes_tags(self):
        assert _strip_html("<b>bold</b> text") == "bold text"

    def test_removes_nested_tags(self):
        assert _strip_html("<p><b>bold</b> text</p>") == "bold text"

    def test_decodes_entities(self):
        assert _strip_html("cats &amp; dogs") == "cats & dogs"

    def test_decodes_quotes(self):
        assert _strip_html("&quot;hello&quot;") == '"hello"'

    def test_none_returns_none(self):
        assert _strip_html(None) is None

    def test_empty_returns_none(self):
        assert _strip_html("") is None

    def test_whitespace_only_returns_none(self):
        assert _strip_html("   ") is None

    def test_tags_only_returns_none(self):
        assert _strip_html("<br/><br/>") is None


class TestParseSearchResults:
    def test_parses_multiple_results(self):
        xml = b"""<items total="2">
            <item type="boardgame" id="13">
                <name type="primary" value="Catan"/>
                <yearpublished value="1995"/>
            </item>
            <item type="boardgame" id="42">
                <name type="primary" value="Catan Junior"/>
                <yearpublished value="2012"/>
            </item>
        </items>"""
        results = _parse_search_results(xml)
        assert len(results) == 2
        assert results[0].bgg_id == 13
        assert results[0].name == "Catan"
        assert results[0].year_published == 1995
        assert results[1].bgg_id == 42
        assert results[1].name == "Catan Junior"
        assert results[1].year_published == 2012

    def test_empty_results(self):
        xml = b'<items total="0"></items>'
        assert _parse_search_results(xml) == []

    def test_missing_year(self):
        xml = b"""<items total="1">
            <item type="boardgame" id="99">
                <name type="primary" value="Mystery Game"/>
            </item>
        </items>"""
        results = _parse_search_results(xml)
        assert len(results) == 1
        assert results[0].year_published is None

    def test_missing_name_element(self):
        xml = b"""<items total="1">
            <item type="boardgame" id="50">
            </item>
        </items>"""
        results = _parse_search_results(xml)
        assert len(results) == 1
        assert results[0].name == ""


class TestParseGameDetail:
    def test_parses_full_detail(self):
        xml = b"""<items>
            <item type="boardgame" id="13">
                <name type="primary" value="Catan"/>
                <name type="alternate" value="Settlers"/>
                <yearpublished value="1995"/>
                <minplayers value="3"/>
                <maxplayers value="4"/>
                <description>Trade and build!</description>
                <image>https://cf.geekdo-images.com/catan.jpg</image>
                <thumbnail>https://cf.geekdo-images.com/catan_t.jpg</thumbnail>
                <link type="boardgamecategory" value="Economic"/>
                <link type="boardgamecategory" value="Negotiation"/>
                <link type="boardgamemechanic" value="Dice Rolling"/>
            </item>
        </items>"""
        detail = _parse_game_detail(xml)
        assert detail is not None
        assert detail.bgg_id == 13
        assert detail.name == "Catan"
        assert detail.year_published == 1995
        assert detail.min_players == 3
        assert detail.max_players == 4
        assert detail.description == "Trade and build!"
        assert detail.image_url == "https://cf.geekdo-images.com/catan.jpg"
        assert detail.thumbnail_url == "https://cf.geekdo-images.com/catan_t.jpg"
        assert detail.categories == ["Economic", "Negotiation"]
        assert detail.mechanics == ["Dice Rolling"]

    def test_no_item_returns_none(self):
        xml = b"<items></items>"
        assert _parse_game_detail(xml) is None

    def test_missing_optional_fields(self):
        xml = b"""<items>
            <item type="boardgame" id="99">
                <name type="primary" value="Minimal Game"/>
            </item>
        </items>"""
        detail = _parse_game_detail(xml)
        assert detail is not None
        assert detail.name == "Minimal Game"
        assert detail.year_published is None
        assert detail.min_players is None
        assert detail.max_players is None
        assert detail.description is None
        assert detail.image_url is None
        assert detail.thumbnail_url is None
        assert detail.categories == []
        assert detail.mechanics == []

    def test_html_description_is_stripped(self):
        xml = b"""<items>
            <item type="boardgame" id="10">
                <name type="primary" value="Html Game"/>
                <description>&lt;p&gt;A &lt;b&gt;great&lt;/b&gt; game&lt;/p&gt;</description>
            </item>
        </items>"""
        detail = _parse_game_detail(xml)
        assert detail is not None
        assert detail.description == "A great game"

    def test_uses_primary_name(self):
        xml = b"""<items>
            <item type="boardgame" id="13">
                <name type="alternate" value="Die Siedler"/>
                <name type="primary" value="Catan"/>
            </item>
        </items>"""
        detail = _parse_game_detail(xml)
        assert detail is not None
        assert detail.name == "Catan"
