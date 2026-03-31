from datetime import datetime

from pydantic import BaseModel


class BadgeDefinitionResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str

    model_config = {"from_attributes": True}


class UserBadgeResponse(BaseModel):
    id: int
    badge: BadgeDefinitionResponse
    awarded_at: datetime

    model_config = {"from_attributes": True}
