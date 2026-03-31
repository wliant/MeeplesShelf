import csv
import io
import json


def parse_csv_sessions(content: str) -> tuple[list[dict], list[str]]:
    """Parse CSV session data. Returns (rows, errors)."""
    rows = []
    errors = []
    reader = csv.DictReader(io.StringIO(content))

    for i, row in enumerate(reader, start=2):
        try:
            game_name = row.get("Game", row.get("game", "")).strip()
            if not game_name:
                errors.append(f"Row {i}: missing game name")
                continue

            date_str = row.get("Date", row.get("date", ""))
            players_str = row.get("Players", row.get("players", ""))
            players = [p.strip() for p in players_str.split(";") if p.strip()]
            winner = row.get("Winner", row.get("winner", "")).strip() or None

            scores_str = row.get("Scores", row.get("scores", ""))
            scores = {}
            if scores_str:
                for entry in scores_str.split(";"):
                    entry = entry.strip()
                    if ":" in entry:
                        name, score = entry.rsplit(":", 1)
                        try:
                            scores[name.strip()] = int(score.strip())
                        except ValueError:
                            pass

            duration = row.get("Duration (min)", row.get("duration_minutes", ""))
            location = row.get("Location", row.get("location", "")).strip() or None
            notes = row.get("Notes", row.get("notes", "")).strip() or None

            rows.append({
                "game_name": game_name,
                "date": date_str.strip(),
                "players": players,
                "winner": winner,
                "scores": scores,
                "duration_minutes": int(duration) if duration else None,
                "location": location,
                "notes": notes,
            })
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    return rows, errors


def parse_bgstats_json(content: str) -> tuple[list[dict], list[str]]:
    """Parse BG Stats JSON export format. Returns (rows, errors)."""
    rows = []
    errors = []

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        return [], [f"Invalid JSON: {e}"]

    plays = data if isinstance(data, list) else data.get("plays", data.get("sessions", []))

    for i, play in enumerate(plays):
        try:
            game_name = play.get("game", play.get("gameName", ""))
            if not game_name:
                errors.append(f"Entry {i + 1}: missing game name")
                continue

            date_str = play.get("date", play.get("playDate", ""))
            player_entries = play.get("players", play.get("playerScores", []))
            players = []
            scores = {}
            winner = None

            for pe in player_entries:
                name = pe.get("name", pe.get("playerName", ""))
                if name:
                    players.append(name)
                    score = pe.get("score", pe.get("totalScore"))
                    if score is not None:
                        try:
                            scores[name] = int(score)
                        except (ValueError, TypeError):
                            pass
                    if pe.get("winner", pe.get("isWinner", False)):
                        winner = name

            rows.append({
                "game_name": game_name,
                "date": str(date_str),
                "players": players,
                "winner": winner,
                "scores": scores,
                "duration_minutes": play.get("durationMin", play.get("duration")),
                "location": play.get("location"),
                "notes": play.get("notes", play.get("comments")),
            })
        except Exception as e:
            errors.append(f"Entry {i + 1}: {e}")

    return rows, errors
