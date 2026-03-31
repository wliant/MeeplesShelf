from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import async_session
from app.routers import export, games, groups, integrations, sessions, stats, tags

app = FastAPI(title="MeeplesShelf", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/health")
async def health_check():
    async with async_session() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "healthy"}
