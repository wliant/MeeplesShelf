from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://meeplesshelf:meeplesshelf@localhost:5432/meeplesshelf"
    )
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:80"]

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Rate limiting
    rate_limit_default: str = "60/minute"
    rate_limit_auth: str = "10/minute"

    # Logging
    log_level: str = "INFO"

    model_config = {"env_prefix": "APP_", "env_file": ".env"}


settings = Settings()
