"""Application configuration settings."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Block Preventer Bridge"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://bpb_user:bpb_secure_pass_2024@localhost:5432/block_preventer_bridge"
    )
    DATABASE_URL_SYNC: str = os.getenv(
        "DATABASE_URL_SYNC",
        "postgresql://bpb_user:bpb_secure_pass_2024@localhost:5432/block_preventer_bridge"
    )
    
    # Zentra API
    ZENTRA_BASE_URL: str = os.getenv("ZENTRA_BASE_URL", "https://api.zentra.io/v1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bpb-secret-key-change-in-production-2024")
    API_KEY: str = os.getenv("API_KEY", "bpb-api-key-2024")
    
    # Queue Processing
    QUEUE_PROCESSOR_INTERVAL: int = 30  # seconds
    HEALTH_CHECK_INTERVAL: int = 1800  # 30 minutes
    STATS_RESET_INTERVAL: int = 3600  # 1 hour
    
    # Default Limits
    DEFAULT_MAX_PER_HOUR: int = 20
    DEFAULT_MAX_PER_3HOURS: int = 45
    DEFAULT_MAX_PER_DAY: int = 120
    DEFAULT_COOLDOWN_MIN: int = 300  # 5 minutes
    DEFAULT_COOLDOWN_MAX: int = 900  # 15 minutes
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
