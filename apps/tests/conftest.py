"""Test configuration.

Integration tests (test_games.py, test_sessions.py) require a PostgreSQL
database because the models use PostgreSQL-specific JSONB columns and the
async routers use db.refresh() with relationship loading that is incompatible
with aiosqlite.

To run integration tests, set APP_DATABASE_URL to a test PostgreSQL database:

    APP_DATABASE_URL=postgresql+asyncpg://test:test@localhost:5432/meeplesshelf_test \
        pytest tests/ -v

Unit tests (test_scoring.py) have no database dependency and always work.
"""
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base

INTEGRATION_DB_URL = os.environ.get("APP_DATABASE_URL")

needs_postgres = pytest.mark.skipif(
    not INTEGRATION_DB_URL or "postgresql" not in INTEGRATION_DB_URL,
    reason="Integration tests require PostgreSQL (set APP_DATABASE_URL)",
)


@pytest_asyncio.fixture
async def client():
    if not INTEGRATION_DB_URL or "postgresql" not in INTEGRATION_DB_URL:
        pytest.skip("Requires PostgreSQL")

    engine = create_async_engine(INTEGRATION_DB_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
