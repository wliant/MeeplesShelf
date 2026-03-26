from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class RawScoreField(BaseModel):
    id: str
    label: str
    type: Literal["raw_score"] = "raw_score"
    description: str | None = None


class NumericField(BaseModel):
    id: str
    label: str
    type: Literal["numeric"] = "numeric"
    multiplier: int = 1
    description: str | None = None


class BooleanField(BaseModel):
    id: str
    label: str
    type: Literal["boolean"] = "boolean"
    value: int
    description: str | None = None


class EnumVariant(BaseModel):
    id: str
    label: str
    value: int


class EnumCountField(BaseModel):
    id: str
    label: str
    type: Literal["enum_count"] = "enum_count"
    variants: list[EnumVariant]
    description: str | None = None


class SetCollectionField(BaseModel):
    id: str
    label: str
    type: Literal["set_collection"] = "set_collection"
    set_values: list[int]
    description: str | None = None


ScoringField = Annotated[
    Union[
        RawScoreField,
        NumericField,
        BooleanField,
        EnumCountField,
        SetCollectionField,
    ],
    Field(discriminator="type"),
]


class ScoringSpec(BaseModel):
    version: int = 1
    fields: list[ScoringField] = []
