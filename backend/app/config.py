import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_ALLOWED_ALGORITHMS = {"HS256", "HS384", "HS512"}


@dataclass(frozen=True)
class Settings:
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_expire_minutes: int


def _load_settings() -> Settings:
    secret = os.environ.get("JWT_SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not set")

    algorithm = os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256"
    if algorithm not in _ALLOWED_ALGORITHMS:
        raise RuntimeError("JWT_ALGORITHM must be HS256, HS384, or HS512")

    raw_minutes = os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60").strip() or "60"
    try:
        minutes = int(raw_minutes)
    except ValueError as exc:
        raise RuntimeError("JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be an integer") from exc
    if minutes <= 0:
        raise RuntimeError("JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")

    return Settings(
        jwt_secret_key=secret,
        jwt_algorithm=algorithm,
        jwt_access_token_expire_minutes=minutes,
    )


settings = _load_settings()
