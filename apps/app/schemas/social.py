from datetime import datetime
from typing import Any

from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
    friend_email: str


class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    friend_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SharedCollectionCreate(BaseModel):
    public_slug: str


class SharedCollectionResponse(BaseModel):
    id: int
    user_id: int
    public_slug: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicProfileResponse(BaseModel):
    display_name: str
    games: list[dict]


class ActivityEventResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    event_type: str
    payload: dict[str, Any]
    created_at: datetime
