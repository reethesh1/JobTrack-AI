from datetime import datetime
from pydantic import BaseModel, ConfigDict


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

