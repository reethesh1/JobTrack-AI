"""Read-only Gmail integration for JobTrack-AI.

Requires Google OAuth credentials and EMAIL_TOKEN_ENCRYPTION_KEY in the backend env.
The app only reads Gmail. It never sends, deletes, or modifies messages.
"""
from __future__ import annotations
import base64
import json
import os
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Optional
from urllib.parse import quote

import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Query
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Session

from app.auth import JWT_ALGORITHM, JWT_SECRET_KEY, get_current_user
from app.database import Base, SessionLocal
from app.models import JobApplication, User

router = APIRouter(prefix="/email", tags=["Email integration"])
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class GmailConnection(Base):
    __tablename__ = "gmail_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    gmail_email = Column(String(255), nullable=False)
    encrypted_credentials = Column(Text, nullable=False)
    connected_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_synced_at = Column(DateTime(timezone=True), nullable=True)


class EmailStatusProposal(Base):
    __tablename__ = "email_status_proposals"
    __table_args__ = (UniqueConstraint("user_id", "gmail_message_id", name="uq_email_proposal_user_message"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gmail_message_id = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False, default="(no subject)")
    sender = Column(String(500), nullable=False, default="")
    received_at = Column(DateTime(timezone=True), nullable=True)
    snippet = Column(Text, nullable=True)
    proposed_status = Column(String(50), nullable=False)
    job_application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True)
    matched_company = Column(String(100), nullable=True)
    matched_job_title = Column(String(150), nullable=True)
    review_status = Column(String(30), nullable=False, default="pending", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise HTTPException(status_code=503, detail=f"Email integration is not configured: set {name} in the backend environment.")
    return value


def _fernet() -> Fernet:
    key = _required_env("EMAIL_TOKEN_ENCRYPTION_KEY")
    try:
        return Fernet(key.encode("ascii"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="EMAIL_TOKEN_ENCRYPTION_KEY must be a valid Fernet key.") from exc


def _oauth_config() -> dict:
    client_id = _required_env("GOOGLE_CLIENT_ID")
    client_secret = _required_env("GOOGLE_CLIENT_SECRET")
    return {"web": {"client_id": client_id, "client_secret": client_secret,
                     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                     "token_uri": "https://oauth2.googleapis.com/token",
                     "redirect_uris": [_required_env("GOOGLE_REDIRECT_URI")]}}


def _make_flow(state: Optional[str] = None) -> Flow:
    flow = Flow.from_client_config(
        _oauth_config(),
        scopes=GMAIL_SCOPES,
        state=state,
        autogenerate_code_verifier=False,
    )
    flow.redirect_uri = _required_env("GOOGLE_REDIRECT_URI")
    return flow


def _encode_state(user_id: int) -> str:
    return jwt.encode({"sub": str(user_id), "purpose": "gmail_oauth", "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _decode_state(state: str) -> int:
    try:
        data = jwt.decode(state, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if data.get("purpose") != "gmail_oauth":
            raise ValueError("wrong purpose")
        return int(data["sub"])
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="The Gmail connection request expired or is invalid. Please try connecting again.") from exc


def _header(headers: list[dict], name: str) -> str:
    return next((h.get("value", "") for h in headers if h.get("name", "").lower() == name.lower()), "")


def _decode_body(payload: dict) -> str:
    chunks: list[str] = []
    def walk(part: dict):
        mime = part.get("mimeType", "")
        data = (part.get("body") or {}).get("data")
        if data and (mime == "text/plain" or not mime):
            try:
                chunks.append(base64.urlsafe_b64decode(data + "===").decode("utf-8", "replace"))
            except Exception:
                pass
        for child in part.get("parts", []) or []:
            walk(child)
    walk(payload or {})
    return "\n".join(chunks)[:12000]


def _classify(subject: str, body: str) -> Optional[str]:
    subject_text = (subject or "").casefold().strip()
    body_text = (body or "").casefold()

    # Ignore obvious non-job-related messages.
    if re.search(
        r"\b(payment|transaction|upi|refund|bank statement|"
        r"customer support|support ticket|invoice|billing)\b",
        subject_text,
    ):
        return None

    # Check for explicit rejection in the subject.
    if re.search(
        r"\b(application rejected|application unsuccessful|"
        r"regret to inform you|not moving forward with your application|"
        r"your application was unsuccessful)\b",
        subject_text,
    ):
        return "Rejected"

    # Only classify explicit job offers.
    if re.search(
        r"\b(job offer|offer letter|offer of employment|"
        r"employment offer|offer for the position)\b",
        subject_text,
    ):
        return "Offer"

    # Identify interview invitations.
    if re.search(
        r"\b(interview invitation|interview scheduled|"
        r"interview confirmation|invitation to interview)\b",
        subject_text,
    ):
        return "Interview"

    # Identify application confirmations.
    if re.search(
        r"\b(thanks for applying|thank you for applying|"
        r"application received|application confirmation|"
        r"successfully applied)\b",
        subject_text,
    ):
        return "Applied"

    # Check the body for explicit job offer confirmations.
    if re.search(
        r"\b(we are pleased to offer you the position|"
        r"we would like to offer you the role|"
        r"formal offer of employment|your offer letter is attached)\b",
        body_text,
    ):
        return "Offer"

    # Check the body for interview confirmations.
    if re.search(
        r"\b(interview has been scheduled|"
        r"we would like to invite you to an interview|"
        r"your interview is confirmed)\b",
        body_text,
    ):
        return "Interview"

    # Check the body for explicit rejections.
    if re.search(
        r"\b(your application has been rejected|"
        r"your application was unsuccessful|"
        r"we will not be moving forward with your application|"
        r"we regret to inform you that your application)\b",
        body_text,
    ):
        return "Rejected"

    # Check the body for application confirmations.
    if re.search(
        r"\b(we have received your application|"
        r"thank you for submitting your application|"
        r"your application has been received)\b",
        body_text,
    ):
        return "Applied"

    # If the email is uncertain, do not create a proposal.
    return None


def _match_application(db: Session, user_id: int, subject: str, sender: str, body: str) -> Optional[JobApplication]:
    jobs = db.query(JobApplication).filter(JobApplication.user_id == user_id).all()
    haystack = f"{subject} {sender} {body[:3000]}".casefold()
    # Prefer an explicit company-name match, then job-title match; avoid guessing when ambiguous.
    matches = []
    for job in jobs:
        company = (job.company or "").strip().casefold()
        title = (job.job_title or "").strip().casefold()
        if company and len(company) > 2 and company in haystack:
            score = 2 + (1 if title and title in haystack else 0)
            matches.append((score, job))
        elif title and len(title) > 5 and title in haystack:
            matches.append((1, job))
    if not matches:
        return None
    matches.sort(key=lambda item: item[0], reverse=True)
    if len(matches) > 1 and matches[0][0] == matches[1][0]:
        return None
    return matches[0][1]


def _credentials_for(connection: GmailConnection, db: Session) -> Credentials:
    try:
        raw = _fernet().decrypt(connection.encrypted_credentials.encode()).decode()
        info = json.loads(raw)
        creds = Credentials.from_authorized_user_info(info, GMAIL_SCOPES)
    except (InvalidToken, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Saved Gmail credentials could not be decrypted. Reconnect Gmail after checking EMAIL_TOKEN_ENCRYPTION_KEY.") from exc
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            connection.encrypted_credentials = _fernet().encrypt(creds.to_json().encode()).decode()
            db.add(connection)
            db.commit()
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Gmail token refresh failed. Please disconnect/reconnect Gmail.") from exc
    if not creds.valid:
        raise HTTPException(status_code=401, detail="Gmail authorization has expired. Please reconnect Gmail.")
    return creds


@router.get("/status")
def gmail_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    connection = db.query(GmailConnection).filter(GmailConnection.user_id == current_user.id).first()
    if not connection:
        return {"connected": False}
    return {"connected": True, "email": connection.gmail_email, "connected_at": connection.connected_at.isoformat() if connection.connected_at else None,
            "last_synced_at": connection.last_synced_at.isoformat() if connection.last_synced_at else None}


@router.post("/connect")
def gmail_connect(current_user: User = Depends(get_current_user)):
    state = _encode_state(current_user.id)
    flow = _make_flow(state)
    url, _ = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent",)
    return {"authorization_url": url}


@router.get("/oauth/callback")
def gmail_oauth_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    user_id = _decode_state(state)
    flow = _make_flow(state)
    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")
        if not gmail_email:
            raise ValueError("Google did not return an email address")
        encrypted = _fernet().encrypt(credentials.to_json().encode()).decode()
        connection = db.query(GmailConnection).filter(GmailConnection.user_id == user_id).first()
        if connection:
            connection.gmail_email = gmail_email
            connection.encrypted_credentials = encrypted
            connection.connected_at = datetime.now(timezone.utc)
        else:
            connection = GmailConnection(user_id=user_id, gmail_email=gmail_email, encrypted_credentials=encrypted)
            db.add(connection)
        db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        print(f"GMAIL OAUTH CALLBACK ERROR: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(status_code=400, detail="Could not connect Gmail. Check the backend terminal for the diagnostic error.") from exc
    # Send the user back to the frontend without placing tokens in the URL.
    frontend_url = os.getenv("FRONTEND_URL", "https://jobtrack-ai-frontend-sddj.onrender.com").rstrip("/")
    return {"connected": True, "email": gmail_email, "message": "Gmail connected. Return to JobTrack-AI to sync messages." , "frontend_url": frontend_url}


@router.post("/sync")
def gmail_sync(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    connection = db.query(GmailConnection).filter(GmailConnection.user_id == current_user.id).first()
    if not connection:
        raise HTTPException(status_code=409, detail="Connect Gmail before syncing.")
    credentials = _credentials_for(connection, db)
    try:
        service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
        # Read-only search, bounded to the last 90 days and likely job-related mail.
        query = 'newer_than:90d {"application received" "thanks for applying" "thank you for applying" "interview" "offer letter" "job offer" "not moving forward" "regret to inform" "application update"}'
        listed = service.users().messages().list(userId="me", q=query, maxResults=100).execute()
        messages = listed.get("messages", []) or []
        created = 0
        skipped = 0
        for item in messages:
            message_id = item.get("id")
            if not message_id:
                continue
            exists = db.query(EmailStatusProposal).filter(EmailStatusProposal.user_id == current_user.id, EmailStatusProposal.gmail_message_id == message_id).first()
            if exists:
                skipped += 1
                continue
            msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
            payload = msg.get("payload", {})
            headers = payload.get("headers", []) or []
            subject = _header(headers, "Subject") or "(no subject)"
            sender = _header(headers, "From")
            body = _decode_body(payload)
            status = _classify(subject, body or msg.get("snippet", ""))
            if not status:
                skipped += 1
                continue
            app = _match_application(db, current_user.id, subject, sender, body)
            date_header = _header(headers, "Date")
            received = None
            if date_header:
                try:
                    received = parsedate_to_datetime(date_header)
                    if received.tzinfo is None:
                        received = received.replace(tzinfo=timezone.utc)
                except (TypeError, ValueError, OverflowError):
                    received = None
            proposal = EmailStatusProposal(user_id=current_user.id, gmail_message_id=message_id, subject=subject[:500], sender=sender[:500], received_at=received,
                                           snippet=(msg.get("snippet", "") or "")[:4000], proposed_status=status,
                                           job_application_id=app.id if app else None,
                                           matched_company=app.company if app else None,
                                           matched_job_title=app.job_title if app else None)
            db.add(proposal)
            created += 1
        connection.last_synced_at = datetime.now(timezone.utc)
        db.commit()
        return {"messages_checked": len(messages), "proposals_created": created, "messages_skipped": skipped,
                "note": "Nothing is changed automatically. Review and approve each proposed status update."}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        print(f"GMAIL SYNC ERROR: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(status_code=502, detail="Gmail sync failed. Check the Gmail connection and backend logs.") from exc


@router.get("/proposals")
def list_proposals(status: str = Query("pending", pattern="^(pending|approved|rejected|all)$"), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(EmailStatusProposal).filter(EmailStatusProposal.user_id == current_user.id)
    if status != "all":
        query = query.filter(EmailStatusProposal.review_status == status)
    rows = query.order_by(EmailStatusProposal.received_at.desc().nullslast(), EmailStatusProposal.id.desc()).limit(300).all()
    return [{"id": row.id, "subject": row.subject, "sender": row.sender, "received_at": row.received_at.isoformat() if row.received_at else None,
             "snippet": row.snippet, "proposed_status": row.proposed_status, "job_application_id": row.job_application_id,
             "matched_company": row.matched_company, "matched_job_title": row.matched_job_title, "review_status": row.review_status} for row in rows]


class ReviewProposalRequest(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    job_application_id: Optional[int] = Field(default=None, ge=1)


@router.post("/proposals/{proposal_id}/review")
def review_proposal(proposal_id: int, data: ReviewProposalRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proposal = db.query(EmailStatusProposal).filter(EmailStatusProposal.id == proposal_id, EmailStatusProposal.user_id == current_user.id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Email proposal not found.")
    if proposal.review_status != "pending":
        raise HTTPException(status_code=409, detail="This email proposal has already been reviewed.")
    if data.decision == "reject":
        proposal.review_status = "rejected"
        proposal.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Proposal rejected."}
    application_id = data.job_application_id or proposal.job_application_id
    if not application_id:
        raise HTTPException(status_code=422, detail="Choose the matching application before approving this status update.")
    job = db.query(JobApplication).filter(JobApplication.id == application_id, JobApplication.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="The selected application was not found.")
    job.status = proposal.proposed_status
    proposal.job_application_id = job.id
    proposal.matched_company = job.company
    proposal.matched_job_title = job.job_title
    proposal.review_status = "approved"
    proposal.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Application status updated after your approval.", "application_id": job.id, "status": job.status}


@router.delete("/disconnect")
def gmail_disconnect(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    connection = db.query(GmailConnection).filter(GmailConnection.user_id == current_user.id).first()
    if connection:
        db.delete(connection)
        db.commit()
    return {"connected": False, "message": "Gmail disconnected from JobTrack-AI. This does not revoke access in your Google account settings."}
