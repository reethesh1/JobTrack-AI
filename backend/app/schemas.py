from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):

    company: str

    job_title: str

    job_url: str = ""

    status: str = "Applied"

    notes: str = ""

    interview_date: Optional[datetime] = None