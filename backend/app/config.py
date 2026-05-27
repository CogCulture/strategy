from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_application_credentials: str = ""
    tavily_api_key: str = ""
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 86400
    max_upload_size_mb: int = 50
    allowed_file_types: str = "pdf,docx,png,jpg,jpeg"

    @property
    def allowed_file_types_list(self) -> list[str]:
        return [s.strip() for s in self.allowed_file_types.split(",") if s.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
