from pydantic import BaseModel


class SessionImportRow(BaseModel):
    game_name: str
    date: str
    players: list[str] = []
    winner: str | None = None
    scores: dict[str, int] = {}
    duration_minutes: int | None = None
    location: str | None = None
    notes: str | None = None


class ImportPreviewResponse(BaseModel):
    rows: list[SessionImportRow]
    total: int
    errors: list[str] = []


class ImportResultResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = []
