from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./cementtrack.db"
    aws_region: str = "eu-west-1"
    ses_sender_email: str = "patkatech@gmail.com"
    s3_bucket_name: str = ""
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
