from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://meeplesshelf:meeplesshelf@localhost:5432/meeplesshelf"
    )
    admin_password: str
    secret_key: str

    model_config = {"env_prefix": "APP_", "env_file": [".env", "../.env"], "extra": "ignore"}


settings = Settings()
