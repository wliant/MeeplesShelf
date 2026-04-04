from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel

from app.config import settings

router = APIRouter(tags=["auth"])

_ALGORITHM = "HS256"
_EXPIRE_HOURS = 24


class TokenRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/auth/token", response_model=TokenResponse)
async def login(payload: TokenRequest) -> TokenResponse:
    if payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    expire = datetime.now(timezone.utc) + timedelta(hours=_EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": "admin", "exp": expire},
        settings.secret_key,
        algorithm=_ALGORITHM,
    )
    return TokenResponse(access_token=token)
