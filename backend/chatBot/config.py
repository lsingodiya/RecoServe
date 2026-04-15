import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "ipre-prod-poc")
    S3_KEY: str = os.getenv("S3_KEY", "final/recommendations.csv")
    MODEL_ID: str = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")
    CORS_ORIGINS: str = "*"

settings = Settings()
