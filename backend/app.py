from typing import List
from fastapi import FastAPI, Depends, HTTPException, Query, APIRouter, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect
from sqlalchemy import func  # <-- Just need it once
from fastapi.responses import JSONResponse  # <-- Just need it once
import logging

logger = logging.getLogger("uvicorn.error")  
from db import SessionLocal, engine
import models, schemas
# Ensure models exist (ok for dev; use migrations in prod)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Trends API")

# CORS - allow your React dev origin (restrict in production)
# GOOD
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Router (keeps things organized)
router = APIRouter()

# -----------------------
# Router endpoints (GET /jobs, GET /jobs/count)
# -----------------------
@router.get("/jobs", response_model=List[schemas.JobResponse])
def get_jobs(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=10000),
    db: Session = Depends(get_db),
):
    """
    Paginated job fetch.
    Example: /jobs?skip=0&limit=100
    """
    jobs = db.query(models.Job).offset(skip).limit(limit).all()
    return jobs

@router.get("/jobs/count")
def get_job_count(db: Session = Depends(get_db)):
    total = db.query(models.Job).count()
    return {"total_jobs": total}

# include router in app
app.include_router(router)

# -----------------------
# App endpoints (other CRUD)
# -----------------------
@app.get("/")
def read_root():
    return {"message": "Job Trends API"}

@app.post("/jobs", response_model=schemas.JobResponse, status_code=201)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    job = models.Job(**payload.dict())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@app.get("/jobs/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.Job_ID == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.put("/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job(job_id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.Job_ID == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.Job_ID == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}
# Debug endpoint: inspect the 'jobs' table columns and show one sample row
@app.get("/debug/job_columns")
def debug_job_columns(db: Session = Depends(get_db)):
    try:
        inspector = inspect(engine)  # engine imported from your db module
        cols = inspector.get_columns("jobs")
        col_names = [c["name"] for c in cols]

        # sample one row to show keys/values (None if empty)
        sample = db.query(models.Job).limit(1).all()
        sample_repr = None
        if sample:
            # convert first row to dict: SQLAlchemy model -> column name mapping
            row = sample[0]
            sample_repr = {}
            for n in col_names:
                try:
                    sample_repr[n] = getattr(row, n)
                except Exception:
                    sample_repr[n] = "<no-attr>"
        return {"columns": col_names, "sample_row": sample_repr}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        return JSONResponse({"error": str(e), "trace": tb}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)














# Helper: choose first existing attribute on models.Job from a candidate list
def _find_job_column(candidates: list[str]):
    for name in candidates:
        if hasattr(models.Job, name):
            return name
    return None


@app.get("/jobs/agg/location")
def agg_by_location_safe(db: Session = Depends(get_db)):
    """
    Tries several candidate column names for location and returns aggregated counts.
    """
    try:
        candidates = ["Location", "company_location", "employee_residence", "employeeResidence", "location", "companyLocation"]
        found = _find_job_column(candidates)
        if not found:
            # if not found, respond with available columns (helpful for debugging)
            inspector = inspect(engine)
            col_names = [c["name"] for c in inspector.get_columns("jobs")]
            return JSONResponse(
                {"error": "No matching location column found on models.Job.",
                 "tried_candidates": candidates,
                 "available_columns": col_names},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        col_attr = getattr(models.Job, found)
        rows = db.query(col_attr, func.count().label("cnt")) \
                 .group_by(col_attr) \
                 .order_by(func.count().desc()) \
                 .all()
        result = [{"label": (r[0] or "Unknown"), "count": int(r[1])} for r in rows]
        return JSONResponse(result)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error("agg_by_location_safe error:\n%s", tb)
        return JSONResponse({"error": str(e), "trace": tb}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.get("/jobs/agg/industry")
def agg_by_industry_safe(db: Session = Depends(get_db)):
    """
    Tries several candidate column names for industry and returns aggregated counts.
    """
    try:
        candidates = ["Industry", "job_category", "category", "industry", "industry_name", "Job_Category"]
        found = _find_job_column(candidates)
        if not found:
            inspector = inspect(engine)
            col_names = [c["name"] for c in inspector.get_columns("jobs")]
            return JSONResponse(
                {"error": "No matching industry column found on models.Job.",
                 "tried_candidates": candidates,
                 "available_columns": col_names},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        col_attr = getattr(models.Job, found)
        rows = db.query(col_attr, func.count().label("cnt")) \
                 .group_by(col_attr) \
                 .order_by(func.count().desc()) \
                 .all()
        result = [{"label": (r[0] or "Unknown"), "count": int(r[1])} for r in rows]
        return JSONResponse(result)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error("agg_by_industry_safe error:\n%s", tb)
        return JSONResponse({"error": str(e), "trace": tb}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)