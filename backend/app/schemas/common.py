from __future__ import annotations

from pydantic import BaseModel, Field


class PageMeta(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=200)
    total: int = Field(ge=0)


class PaginatedResponse(BaseModel):
    meta: PageMeta

