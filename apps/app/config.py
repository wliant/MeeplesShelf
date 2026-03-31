from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://meeplesshelf:meeplesshelf@localhost:5432/meeplesshelf"
    )
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:80"]

    model_config = {"env_prefix": "APP_", "env_file": ".env"}


settings = Settings()
