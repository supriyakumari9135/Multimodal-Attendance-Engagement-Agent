from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multimodal Attendance & Engagement Agent"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    REPORTS_DIR: Path = DATA_DIR / "reports"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    
    # SQLite offline DB
    DATABASE_URL: str = f"sqlite:///{(DATA_DIR / 'attendance.db').as_posix()}"
    
    # Privacy & Retention
    MEDIA_RETENTION_HOURS: int = 24
    ENABLE_ANONYMOUS_DEFAULT: bool = True
    ALLOW_IDENTITY_MATCHING: bool = True
    
    # Processing defaults
    DEFAULT_SAMPLE_RATE_FPS: float = 1.0
    MIN_OBSERVATION_SECONDS_PRESENT: float = 30.0
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure required directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
