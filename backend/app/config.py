from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # AI
    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"

    # OCR
    tesseract_path: str = ""
    poppler_path: str = ""

    # Database
    database_url: str = "sqlite:///./data/idp.db"

    # Upload
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
