from __future__ import annotations

from datetime import date, timedelta


def fill_month_gaps(
    data: list[dict[str, object]],
    months: int,
    today: date | None = None,
) -> list[dict[str, object]]:
    """Return a contiguous list of {month, session_count} dicts for the last *months* months.

    Missing months are filled with session_count=0.  *data* items must have
    ``month`` (str "YYYY-MM") and ``session_count`` (int) keys.
    """
    if today is None:
        today = date.today()

    lookup = {d["month"]: d["session_count"] for d in data}

    result: list[dict[str, object]] = []
    # Walk backwards from today's month, then reverse
    current = today.replace(day=1)
    for _ in range(months):
        key = current.strftime("%Y-%m")
        result.append({"month": key, "session_count": lookup.get(key, 0)})
        current = (current - timedelta(days=1)).replace(day=1)

    result.reverse()
    return result
