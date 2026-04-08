from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://meeplesshelf:meeplesshelf@localhost:5432/meeplesshelf"
    )
    admin_password: str
    secret_key: str
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "meeplesshelf"
    s3_public_url: str = "http://localhost:9000"

    model_config = {"env_prefix": "APP_", "env_file": [".env", "../.env"], "extra": "ignore"}


settings = Settings()
