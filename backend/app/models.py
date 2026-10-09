from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    company = Column(String(100), nullable=False)
    job_title = Column(String(150), nullable=False)
    job_url = Column(String(500))

    status = Column(
        String(50),
        nullable=False,
        default="Applied"
    )

    notes = Column(Text)