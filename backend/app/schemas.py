from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    company: str
    job_title: str
    job_url: str = ""
    status: str = "Applied"
    notes: str = ""
    interview_date: datetime | None = None


class JobResponse(BaseModel):
    id: int
    company: str
    job_title: str
    job_url: str | None = None
    status: str
    notes: str | None = None
    interview_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class JobImportCreate(BaseModel):
    company: str = Field(..., min_length=1, max_length=100)
    job_title: str = Field(..., min_length=1, max_length=150)
    job_url: str | None = Field(default=None, max_length=500)
    source: str = Field(default="unknown", max_length=50)
    source_url: str | None = Field(default=None, max_length=500)
    tracking_method: str = Field(default="browser_extension", max_length=50)
    external_id: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class JobImportResponse(BaseModel):
    id: int
    company: str
    job_title: str
    job_url: str | None
    source: str
    source_url: str | None
    tracking_method: str
    external_id: str | None
    review_status: str
    notes: str | None
    created_at: datetime | None
    reviewed_at: datetime | None
    job_application_id: int | None

    model_config = ConfigDict(from_attributes=True)
