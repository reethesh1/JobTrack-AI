from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.database import Base, engine, SessionLocal
from app import models
from app.models import JobApplication
from app.schemas import JobCreate


Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobTrack AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "JobTrack AI backend is running"}


@app.post("/jobs")
def create_job(job: JobCreate):
    db = SessionLocal()

    new_job = JobApplication(
        company=job.company,
        job_title=job.job_title,
        job_url=job.job_url,
        status=job.status,
        notes=job.notes
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    db.close()

    return new_job

 
@app.get("/jobs")
def get_jobs(
    company: str = "",
    status: str = "",
    sort: str = "newest",
    page: int = 1,
    limit: int = 10
):
    db = SessionLocal()

    query = db.query(JobApplication)

    # Company filter
    if company:
        query = query.filter(
            JobApplication.company.ilike(f"%{company}%")
        )

    # Status filter
    if status:
        query = query.filter(
            JobApplication.status.ilike(f"%{status}%")
        )

    # Sorting
    if sort == "newest":
        query = query.order_by(JobApplication.id.desc())

    elif sort == "oldest":
        query = query.order_by(JobApplication.id.asc())

    # Pagination
    skip = (page - 1) * limit

    jobs = query.offset(skip).limit(limit).all()

    db.close()

    return jobs

@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: JobCreate):
    db = SessionLocal()

    existing_job = db.query(JobApplication).filter(
        JobApplication.id == job_id
    ).first()

    if existing_job is None:
        db.close()
        return {"error": "Job application not found"}

    existing_job.company = job.company
    existing_job.job_title = job.job_title
    existing_job.job_url = job.job_url
    existing_job.status = job.status
    existing_job.notes = job.notes

    db.commit()
    db.refresh(existing_job)
    db.close()

    return existing_job

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    db = SessionLocal()

    job = db.query(JobApplication).filter(
        JobApplication.id == job_id
    ).first()

    if job is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    db.delete(job)
    db.commit()
    db.close()

    return {"message": "Job application deleted successfully"}


@app.get("/jobs/stats")
def get_job_stats():
    db = SessionLocal()

    total = db.query(JobApplication).count()
    current_month = datetime.now().month
    current_year = datetime.now().year

    this_month = db.query(JobApplication).filter(
    JobApplication.created_at >= datetime(current_year, current_month, 1)
    ).count()
    

    applied = db.query(JobApplication).filter(
        JobApplication.status.ilike("Applied")
    ).count()

    interviews = db.query(JobApplication).filter(
        JobApplication.status.ilike("Interview")
    ).count()

    offers = db.query(JobApplication).filter(
        JobApplication.status.ilike("Offer")
    ).count()

    rejected = db.query(JobApplication).filter(
        JobApplication.status.ilike("Rejected")
    ).count()

    db.close()

    return {
        "total": total,
        "this_month": this_month,
        "applied": applied,
        "interviews": interviews,
        "offers": offers,
        "rejected": rejected
    }