from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
)
from sqlalchemy.sql import func

from app.database import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    company = Column(String(100), nullable=False)
    job_title = Column(String(150), nullable=False)
    job_url = Column(String(500))
    status = Column(String(50), nullable=False, default="Applied")
    notes = Column(Text)
    interview_date = Column(DateTime(timezone=True), nullable=True)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(150), nullable=False, default="")
    email = Column(String(255), nullable=False, default="")
    target_role = Column(String(150), nullable=False, default="")
    location = Column(String(150), nullable=False, default="")
    linkedin = Column(String(500), nullable=False, default="")
    portfolio = Column(String(500), nullable=False, default="")


class JobImport(Base):
    __tablename__ = "job_imports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    company = Column(String(100), nullable=False)
    job_title = Column(String(150), nullable=False)
    job_url = Column(String(500), nullable=True)
    source = Column(String(50), nullable=False, default="unknown")
    source_url = Column(String(500), nullable=True)
    tracking_method = Column(
        String(50),
        nullable=False,
        default="browser_extension",
    )
    external_id = Column(String(255), nullable=True)
    review_status = Column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    job_application_id = Column(
        Integer,
        ForeignKey("job_applications.id"),
        nullable=True,
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False, default="")
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Existing accounts remain verified by default.
    # New registrations will explicitly set email_verified=False.
    email_verified = Column(Boolean, nullable=False, default=True)

    # Store a protected hash, never the raw verification code.
    verification_code_hash = Column(String(64), nullable=True)
    verification_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    verification_attempts = Column(Integer, nullable=False, default=0)
    verification_sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )