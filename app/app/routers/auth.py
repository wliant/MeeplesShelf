from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.session import Player

router = APIRouter(tags=["auth"])

_ALGORITHM = "HS256"
_EXPIRE_HOURS = 24


class TokenRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GuestLoginRequest(BaseModel):
    name: str


class GuestTokenResponse(TokenResponse):
    player_id: int
    player_name: str


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


@router.post("/auth/guest", response_model=GuestTokenResponse)
async def login_guest(
    payload: GuestLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> GuestTokenResponse:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    result = await db.execute(
        select(Player).where(func.lower(Player.name) == name.lower())
    )
    player = result.scalar_one_or_none()

    if player is None:
        player = Player(name=name)
        db.add(player)
        await db.commit()
        await db.refresh(player)

    expire = datetime.now(timezone.utc) + timedelta(hours=_EXPIRE_HOURS)
    token = jwt.encode(
        {
            "sub": "player",
            "player_id": player.id,
            "player_name": player.name,
            "exp": expire,
        },
        settings.secret_key,
        algorithm=_ALGORITHM,
    )
    return GuestTokenResponse(
        access_token=token, player_id=player.id, player_name=player.name,
    )
