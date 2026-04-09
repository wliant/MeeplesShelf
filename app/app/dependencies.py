from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_ALGORITHM = "HS256"


@dataclass
class AuthUser:
    role: str  # "admin" or "player"
    player_id: int | None = None
    player_name: str | None = None


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials, settings.secret_key, algorithms=[_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials, settings.secret_key, algorithms=[_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    sub = payload.get("sub")
    if sub == "admin":
        return AuthUser(role="admin")
    if sub == "player":
        return AuthUser(
            role="player",
            player_id=payload.get("player_id"),
            player_name=payload.get("player_name"),
        )
    raise HTTPException(status_code=403, detail="Forbidden")
