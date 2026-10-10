from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import Base, engine, SessionLocal
from app import models
from app.models import JobApplication
from app.schemas import JobCreate


# Create database tables if they do not already exist
Base.metadata.create_all(bind=engine)


# Initialize FastAPI
app = FastAPI(title="JobTrack AI")


# Allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://jobtrack-ai-frontend-sddj.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
def root():
    return {"message": "JobTrack AI backend is running"}


# Get application statistics
@app.get("/jobs/stats")
def get_job_stats():
    db = SessionLocal()

    try:
        jobs = db.query(JobApplication).all()

        now = datetime.now(timezone.utc)

        stats = {
            "total": len(jobs),
            "this_month": 0,
            "applied": 0,
            "interviews": 0,
            "offers": 0,
            "rejected": 0,
        }

        for job in jobs:
            status = (job.status or "").strip().lower()

            if status == "applied":
                stats["applied"] += 1

            elif status in ["interview", "interviews"]:
                stats["interviews"] += 1

            elif status in ["offer", "offers", "offer received"]:
                stats["offers"] += 1

            elif status == "rejected":
                stats["rejected"] += 1

            if job.created_at:
                created_at = job.created_at

                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)

                if (
                    created_at.year == now.year
                    and created_at.month == now.month
                ):
                    stats["this_month"] += 1

        return stats

    finally:
        db.close()

# Get all job applications
@app.get("/jobs")
def get_jobs():
    db: Session = SessionLocal()

    try:
        jobs = db.query(JobApplication).all()

        return [
            {
                "id": job.id,
                "company": job.company,
                "job_title": job.job_title,
                "job_url": job.job_url,
                "status": job.status,
                "notes": job.notes,
            }
            for job in jobs
        ]

    finally:
        db.close()


# Create a job application
@app.post("/jobs")
def create_job(job: JobCreate):
    db: Session = SessionLocal()

    try:
        new_job = JobApplication(
            company=job.company,
            job_title=job.job_title,
            job_url=job.job_url,
            status=job.status,
            notes=job.notes,
        )

        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return {
            "id": new_job.id,
            "company": new_job.company,
            "job_title": new_job.job_title,
            "job_url": new_job.job_url,
            "status": new_job.status,
            "notes": new_job.notes,
        }

    finally:
        db.close()


# Update a job application
@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: JobCreate):
    db: Session = SessionLocal()

    try:
        existing_job = (
            db.query(JobApplication)
            .filter(JobApplication.id == job_id)
            .first()
        )

        if existing_job is None:
            raise HTTPException(
                status_code=404,
                detail="Job application not found",
            )

        existing_job.company = job.company
        existing_job.job_title = job.job_title
        existing_job.job_url = job.job_url
        existing_job.status = job.status
        existing_job.notes = job.notes

        db.commit()
        db.refresh(existing_job)

        return {
            "id": existing_job.id,
            "company": existing_job.company,
            "job_title": existing_job.job_title,
            "job_url": existing_job.job_url,
            "status": existing_job.status,
            "notes": existing_job.notes,
        }

    finally:
        db.close()


# Delete a job application
@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    db: Session = SessionLocal()

    try:
        existing_job = (
            db.query(JobApplication)
            .filter(JobApplication.id == job_id)
            .first()
        )

        if existing_job is None:
            raise HTTPException(
                status_code=404,
                detail="Job application not found",
            )

        db.delete(existing_job)
        db.commit()

        return {
            "message": "Job application deleted successfully"
        }

    finally:
        db.close()