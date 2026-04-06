import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import auth, export, games, sessions, stats


class SPAStaticFiles(StaticFiles):
    """Serves index.html for any path not matched by a real static file (SPA routing)."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


app = FastAPI(title="MeeplesShelf", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

# Serve compiled React SPA in production.
# The guard makes local dev startup safe when no static dir exists.
_static_dir = os.getenv("STATIC_DIR", str(Path(__file__).parent / "static"))
if Path(_static_dir).is_dir():
    app.mount("/", SPAStaticFiles(directory=_static_dir, html=True), name="static")
