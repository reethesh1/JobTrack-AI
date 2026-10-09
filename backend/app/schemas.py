from pydantic import BaseModel


class JobCreate(BaseModel):
    company: str
    job_title: str
    job_url: str = ""
    status: str = "Applied"
    notes: str = ""