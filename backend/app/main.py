from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os, tempfile, openai as _openai

from . import models, database, ai_service
from .ai_pipeline import run_pipeline

_oai_client = _openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY")) if os.environ.get("OPENAI_API_KEY") else None

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="MALAK API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClaimRequest(BaseModel):
    claim: str

class SourceOut(BaseModel):
    name: str
    url: str

class ClaimResponse(BaseModel):
    matched_claim: Optional[str] = None
    risk_level: str
    explanation: str
    sources: List[SourceOut] = []

class HistoryItem(BaseModel):
    id: int
    claim: str
    risk_level: str
    source: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not _oai_client:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    suffix = ".m4a" if "m4a" in (file.content_type or "") else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            result = _oai_client.audio.transcriptions.create(model="whisper-1", file=f)
        return {"text": result.text}
    finally:
        os.unlink(tmp_path)

@app.post("/check-claim-stream")
async def check_claim_stream(request: ClaimRequest, db: Session = Depends(database.get_db)):
    async def event_stream():
        sources = []
        evidence = {}
        verdict = {}
        async for chunk in run_pipeline(request.claim):
            yield chunk
            # parse done event to save to DB
            if chunk.startswith("event: done"):
                import json as _json
                data_line = [l for l in chunk.split("\n") if l.startswith("data:")]
                if data_line:
                    payload = _json.loads(data_line[0][5:])
                    sources = payload.get("sources", [])
                    verdict = payload.get("verdict", {})
                    first_source = sources[0]["name"] if sources else None
                    db_check = models.CheckHistory(
                        claim=request.claim,
                        risk_level=verdict.get("risk_level", "unknown"),
                        source=first_source,
                        language="en"
                    )
                    db.add(db_check)
                    db.commit()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

@app.post("/check-claim", response_model=ClaimResponse)
def check_claim(request: ClaimRequest, db: Session = Depends(database.get_db)):
    result = ai_service.check_claim_with_ai(request.claim)

    # Store first source name for history display
    first_source = result.sources[0].name if result.sources else None

    db_check = models.CheckHistory(
        claim=request.claim,
        risk_level=result.risk_level,
        source=first_source,
        language="en"
    )
    db.add(db_check)
    db.commit()
    db.refresh(db_check)

    return ClaimResponse(
        matched_claim=result.matched_claim,
        risk_level=result.risk_level,
        explanation=result.explanation,
        sources=[SourceOut(name=s.name, url=s.url) for s in result.sources]
    )

@app.get("/checks/history", response_model=List[HistoryItem])
def get_history(db: Session = Depends(database.get_db)):
    return db.query(models.CheckHistory).order_by(models.CheckHistory.timestamp.desc()).limit(20).all()

@app.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(database.get_db)):
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    weekly_checks = db.query(models.CheckHistory).filter(models.CheckHistory.timestamp >= seven_days_ago).all()

    high_risk_count = sum(1 for c in weekly_checks if c.risk_level == "high")
    medium_risk_count = sum(1 for c in weekly_checks if c.risk_level == "medium")
    total_count = len(weekly_checks)

    daily_counts = {}
    for i in range(7):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_counts[day] = 0

    for check in weekly_checks:
        day_str = check.timestamp.strftime("%Y-%m-%d")
        if day_str in daily_counts:
            daily_counts[day_str] += 1

    trend_data = [{"date": k, "count": v} for k, v in sorted(daily_counts.items())]

    return {
        "weekly": {
            "high_risk": high_risk_count,
            "medium_risk": medium_risk_count,
            "total_checks": total_count
        },
        "trend": trend_data
    }
