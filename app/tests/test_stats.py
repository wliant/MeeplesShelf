from datetime import date

from app.services.stats import fill_month_gaps


class TestFillMonthGaps:
    def test_fills_missing_months(self):
        data = [
            {"month": "2025-01", "session_count": 3},
            {"month": "2025-03", "session_count": 1},
        ]
        result = fill_month_gaps(data, months=3, today=date(2025, 3, 15))
        assert result == [
            {"month": "2025-01", "session_count": 3},
            {"month": "2025-02", "session_count": 0},
            {"month": "2025-03", "session_count": 1},
        ]

    def test_empty_input_returns_zeros(self):
        result = fill_month_gaps([], months=3, today=date(2025, 6, 1))
        assert result == [
            {"month": "2025-04", "session_count": 0},
            {"month": "2025-05", "session_count": 0},
            {"month": "2025-06", "session_count": 0},
        ]

    def test_single_month(self):
        data = [{"month": "2025-05", "session_count": 7}]
        result = fill_month_gaps(data, months=1, today=date(2025, 5, 20))
        assert result == [{"month": "2025-05", "session_count": 7}]

    def test_contiguous_data_unchanged(self):
        data = [
            {"month": "2025-01", "session_count": 2},
            {"month": "2025-02", "session_count": 5},
            {"month": "2025-03", "session_count": 1},
        ]
        result = fill_month_gaps(data, months=3, today=date(2025, 3, 10))
        assert result == data

    def test_twelve_months(self):
        result = fill_month_gaps([], months=12, today=date(2025, 12, 31))
        assert len(result) == 12
        assert result[0]["month"] == "2025-01"
        assert result[-1]["month"] == "2025-12"
        assert all(r["session_count"] == 0 for r in result)

    def test_spans_year_boundary(self):
        data = [
            {"month": "2024-12", "session_count": 4},
            {"month": "2025-02", "session_count": 2},
        ]
        result = fill_month_gaps(data, months=4, today=date(2025, 2, 15))
        assert result == [
            {"month": "2024-11", "session_count": 0},
            {"month": "2024-12", "session_count": 4},
            {"month": "2025-01", "session_count": 0},
            {"month": "2025-02", "session_count": 2},
        ]
