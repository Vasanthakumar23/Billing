from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Defaults are for local/dev only; override via env vars in production.
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/billing"
    jwt_secret: str = "dev-secret-change-me"

    cors_origins: list[str] = ["http://localhost:3000"]
    receipt_prefix: str = "FEE-"

    jwt_algorithm: str = "HS256"
    jwt_access_token_exp_minutes: int = 60 * 24


settings = Settings()  # type: ignore[call-arg]
