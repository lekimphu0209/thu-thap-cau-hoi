from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "Dataset Builder API"
    APP_ENV: str = "development"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DB_HOST: str = "localhost"
    DB_PORT: int = 5437
    DB_USER: str = "golden"
    DB_PASSWORD: str = "golden"
    DB_NAME: str = "golden_dataset"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: list[str] = ["*"]

    JWT_SECRET_KEY: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    AUTO_CREATE_TABLES: bool = True
    SEED_TAXONOMY: bool = True
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    DEFAULT_ADMIN_PASSWORD: str = "ChangeMe123!"
    DEFAULT_ADMIN_FULL_NAME: str = "System Admin"

    # Web A (Guideline Management) read-only sync DB
    GUIDELINE_SYNC_DB_HOST: str = "guideline-db"
    GUIDELINE_SYNC_DB_PORT: int = 5436
    GUIDELINE_SYNC_DB_USER: str = "web_b_readonly"
    GUIDELINE_SYNC_DB_PASSWORD: str = ""
    GUIDELINE_SYNC_DB_NAME: str = "guideline_management"

    GUIDELINE_SYNC_ENABLED: bool = True
    GUIDELINE_SYNC_INTERVAL_MINUTES: int = 60

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
