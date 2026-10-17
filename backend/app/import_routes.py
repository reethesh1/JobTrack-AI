import os
import secrets

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import JobApplication, JobImport
from app.schemas import JobImportCreate


router = APIRouter(
    prefix="/imports",
    tags=["Automatic Application Imports"],
)


def require_import_token(
    x_import_token: str | None = Header(default=None),
):
    expected_token = os.getenv("JOBTRACK_IMPORT_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=503,
            detail="Automatic imports are not configured.",
        )

    if not x_import_token or not secrets.compare_digest(
        x_import_token,
        expected_token,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing import token.",
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize(value: str | None) -> str:
    return (value or "").strip().casefold()


def find_duplicate(
    db: Session,
    company: str,
    job_title: str,
    job_url: str | None,
    exclude_import_id: int | None = None,
):
    normalized_url = normalize(job_url)

    if normalized_url:
        existing_application = (
            db.query(JobApplication)
            .filter(
                func.lower(func.trim(JobApplication.job_url))
                == normalized_url
            )
            .first()
        )

        if existing_application:
            return {
                "type": "application",
                "id": existing_application.id,
            }

        query = db.query(JobImport).filter(
            func.lower(func.trim(JobImport.job_url)) == normalized_url,
            JobImport.review_status.in_(["pending", "approved"]),
        )
    else:
        existing_application = (
            db.query(JobApplication)
            .filter(
                func.lower(func.trim(JobApplication.company))
                == normalize(company),
                func.lower(func.trim(JobApplication.job_title))
                == normalize(job_title),
            )
            .first()
        )

        if existing_application:
            return {
                "type": "application",
                "id": existing_application.id,
            }

        query = db.query(JobImport).filter(
            func.lower(func.trim(JobImport.company))
            == normalize(company),
            func.lower(func.trim(JobImport.job_title))
            == normalize(job_title),
            JobImport.review_status.in_(["pending", "approved"]),
        )

    if exclude_import_id is not None:
        query = query.filter(JobImport.id != exclude_import_id)

    existing_import = query.first()

    if existing_import:
        return {
            "type": "import",
            "id": existing_import.id,
        }

    return None


@router.post(
    "",
    dependencies=[Depends(require_import_token)],
)
def create_import(
    data: JobImportCreate,
    db: Session = Depends(get_db),
):
    company = data.company.strip()
    job_title = data.job_title.strip()

    if not company or not job_title:
        raise HTTPException(
            status_code=422,
            detail="Company and job title cannot be blank.",
        )

    allowed_sources = {
        "linkedin",
        "indeed",
        "email",
        "other",
        "unknown",
    }

    allowed_methods = {
        "browser_extension",
        "email_integration",
        "manual_import",
    }

    if data.source not in allowed_sources:
        raise HTTPException(
            status_code=422,
            detail="Unsupported source.",
        )

    if data.tracking_method not in allowed_methods:
        raise HTTPException(
            status_code=422,
            detail="Unsupported tracking method.",
        )

    duplicate = find_duplicate(
        db,
        company,
        job_title,
        data.job_url,
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "A matching application or import already exists.",
                "duplicate": duplicate,
            },
        )

    if data.external_id:
        existing_external_id = (
            db.query(JobImport)
            .filter(
                JobImport.source == data.source,
                JobImport.external_id == data.external_id,
                JobImport.review_status.in_(["pending", "approved"]),
            )
            .first()
        )

        if existing_external_id:
            raise HTTPException(
                status_code=409,
                detail="This external application has already been imported.",
            )

    imported_job = JobImport(
        company=company,
        job_title=job_title,
        job_url=data.job_url,
        source=data.source,
        source_url=data.source_url,
        tracking_method=data.tracking_method,
        external_id=data.external_id,
        review_status="pending",
        notes=data.notes,
    )

    db.add(imported_job)
    db.commit()
    db.refresh(imported_job)

    return imported_job


@router.get(
    "/pending",
    dependencies=[Depends(require_import_token)],
)
def get_pending_imports(db: Session = Depends(get_db)):
    return (
        db.query(JobImport)
        .filter(JobImport.review_status == "pending")
        .order_by(JobImport.created_at.desc())
        .all()
    )


@router.get(
    "/history",
    dependencies=[Depends(require_import_token)],
)
def get_import_history(db: Session = Depends(get_db)):
    return (
        db.query(JobImport)
        .filter(JobImport.review_status != "pending")
        .order_by(JobImport.created_at.desc())
        .all()
    )


@router.post(
    "/{import_id}/approve",
    dependencies=[Depends(require_import_token)],
)
def approve_import(
    import_id: int,
    db: Session = Depends(get_db),
):
    imported_job = (
        db.query(JobImport)
        .filter(JobImport.id == import_id)
        .first()
    )

    if imported_job is None:
        raise HTTPException(status_code=404, detail="Import not found.")

    if imported_job.review_status != "pending":
        raise HTTPException(
            status_code=409,
            detail="This import has already been reviewed.",
        )

    duplicate = find_duplicate(
        db,
        imported_job.company,
        imported_job.job_title,
        imported_job.job_url,
        exclude_import_id=imported_job.id,
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "A matching application already exists.",
                "duplicate": duplicate,
            },
        )

    import_note = (
        f"Imported via {imported_job.source} "
        f"({imported_job.tracking_method})."
    )

    notes = "\n".join(
        part
        for part in [imported_job.notes, import_note]
        if part
    )

    application = JobApplication(
        company=imported_job.company,
        job_title=imported_job.job_title,
        job_url=imported_job.job_url or "",
        status="Applied",
        notes=notes,
    )

    try:
        db.add(application)
        db.flush()

        imported_job.review_status = "approved"
        imported_job.reviewed_at = datetime.now(timezone.utc)
        imported_job.job_application_id = application.id

        db.commit()
        db.refresh(application)

        return {
            "message": "Import approved and added to Applications.",
            "application": {
                "id": application.id,
                "company": application.company,
                "job_title": application.job_title,
                "job_url": application.job_url,
                "status": application.status,
            },
            "import_id": imported_job.id,
        }

    except Exception:
        db.rollback()
        raise


@router.post(
    "/{import_id}/reject",
    dependencies=[Depends(require_import_token)],
)
def reject_import(
    import_id: int,
    db: Session = Depends(get_db),
):
    imported_job = (
        db.query(JobImport)
        .filter(JobImport.id == import_id)
        .first()
    )

    if imported_job is None:
        raise HTTPException(status_code=404, detail="Import not found.")

    if imported_job.review_status != "pending":
        raise HTTPException(
            status_code=409,
            detail="This import has already been reviewed.",
        )

    imported_job.review_status = "rejected"
    imported_job.reviewed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Import rejected.",
        "import_id": imported_job.id,
        "review_status": imported_job.review_status,
    }