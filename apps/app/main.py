from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.config import settings
from app.database import async_session
from app.logging_config import setup_logging
from app.middleware.logging import RequestLoggingMiddleware
from app.routers import auth, badges, export, games, groups, imports, integrations, sessions, social, stats, tags

setup_logging()


def _key_func(request: Request) -> str:
    """Use user ID from JWT if available, otherwise IP address."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        from app.services.auth import decode_access_token

        user_id = decode_access_token(auth_header[7:])
        if user_id is not None:
            return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func, default_limits=[settings.rate_limit_default])

app = FastAPI(title="MeeplesShelf", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(social.router, prefix="/api")
app.include_router(badges.router, prefix="/api")


@app.get("/health")
async def health_check():
    async with async_session() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "healthy"}
