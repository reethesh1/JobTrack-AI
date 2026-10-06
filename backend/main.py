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
    allow_origins=[
        "http://localhost:5173",
        "https://jobtrack-ai-frontend-sddj.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "JobTrack AI backend is running"}