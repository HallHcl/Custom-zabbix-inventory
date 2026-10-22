import logging
from pathlib import Path
from typing import Any, List
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    APP_NAME: str = "DC VISION Operations Portal"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Perimeter Security / Optional API Key (Disabled by default for internal NOC intranet)
    API_KEY_ENABLED: bool = False
    API_KEY: str = ""

    # Database URL direct override (e.g. from Docker Compose)
    DATABASE_URL: str | None = None
    REDIS_URL: str | None = None

    # PostgreSQL defaults
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "dcim_db"

    # Redis defaults
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Zabbix Integration
    ZABBIX_MODE: str = "external"  # "external" or "embedded"
    ZABBIX_URL: str = "http://192.168.1.85:8080/api_jsonrpc.php"
    ZABBIX_API_URL: str | None = None
    ZABBIX_WEB_URL: str | None = None
    ZABBIX_API_TOKEN: str = ""
    ZABBIX_USER: str = "Admin"
    ZABBIX_PASSWORD: str = ""
    ZABBIX_SYNC_INTERVAL_SECONDS: int = 30
    ZABBIX_STALE_THRESHOLD_SECONDS: int = 120
    ZABBIX_DISCONNECTED_THRESHOLD_SECONDS: int = 600
    SIMULATE_ZABBIX_TELEMETRY: bool = False
    AUTO_SEED_DEMO_DATA: bool = False

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

    @property
    def zabbix_web_console_url(self) -> str:
        if self.ZABBIX_WEB_URL:
            return self.ZABBIX_WEB_URL.rstrip("/")
        effective = self.zabbix_effective_url
        if effective.endswith("/api_jsonrpc.php"):
            return effective[:-len("/api_jsonrpc.php")].rstrip("/")
        return effective.rstrip("/")

    def model_post_init(self, __context: Any) -> None:
        if not self.ZABBIX_API_TOKEN and self.APP_ENV not in ("test", "testing"):
            logger.warning("ZABBIX_API_TOKEN is empty. Set it in .env or environment variables.")
        if not self.POSTGRES_PASSWORD and self.APP_ENV not in ("test", "testing"):
            logger.warning("POSTGRES_PASSWORD is empty. Set it in .env or environment variables.")


settings = Settings()
