from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://meeplesshelf:meeplesshelf@localhost:5432/meeplesshelf"
    )

    model_config = {"env_prefix": "APP_"}


settings = Settings()
