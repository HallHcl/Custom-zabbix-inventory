from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "POP API"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Database URL direct override (e.g. from Docker Compose)
    DATABASE_URL: str | None = None
    REDIS_URL: str | None = None

    # PostgreSQL defaults
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "nexustwin_secret"
    POSTGRES_DB: str = "dcim_db"

    # Redis defaults
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Zabbix Integration
    ZABBIX_MODE: str = "external"  # "external" or "embedded"
    ZABBIX_URL: str = "http://192.168.1.85:8080/api_jsonrpc.php"
    ZABBIX_API_URL: str | None = None
    ZABBIX_API_TOKEN: str = "9f14f8772b0ddb6d29ebab9f809201c030b3051d3d7f8639ddd4c6fba92c3808"
    ZABBIX_USER: str = "Admin"
    ZABBIX_PASSWORD: str = "zabbix"
    ZABBIX_SYNC_INTERVAL_SECONDS: int = 30
    SIMULATE_ZABBIX_TELEMETRY: bool = True

    # AI & Embeddings
    AI_PROVIDER_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8090",
    ]

    model_config = SettingsConfigDict(
        env_file=[str(Path(__file__).resolve().parent.parent / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def zabbix_effective_url(self) -> str:
        if self.ZABBIX_API_URL:
            return self.ZABBIX_API_URL
        return self.ZABBIX_URL


settings = Settings()
