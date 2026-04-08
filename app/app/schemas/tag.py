from datetime import datetime

from pydantic import BaseModel, field_validator


class TagCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tag name must not be empty")
        if len(v) > 100:
            raise ValueError("Tag name must be at most 100 characters")
        return v


class TagRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
