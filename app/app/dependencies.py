from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_ALGORITHM = "HS256"


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
