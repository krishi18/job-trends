import uvicorn
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload
from db import SessionLocal, engine
import models
import schemas

print("\n🚀 Starting Job Trends API...\n")

try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
except Exception as e:
    print(f"⚠️ Error: {e}")

app = FastAPI(title="Job Trends API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    try:
        return SessionLocal()
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return None

@app.get("/")
def read_root():
    return {"message": "Job Trends API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    db = get_db()
    if not db:
        return {"status": "error", "message": "DB connection failed"}
    try:
        count = db.query(models.Job).count()
        db.close()
        return {"status": "healthy", "jobs": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/analytics/summary")
def get_analytics_summary():
    print("📊 Analytics request received")
    defaults = {
        "total_jobs": 0, "avg_salary": 0, "top_skills": [],
        "salary_trend": [], "work_setting": [], "company_size": []
    }
    
    db = get_db()
    if not db:
        return defaults

    try:
        total = db.query(models.Job).count()
        print(f"  Found {total} jobs")
        
        if total == 0:
            return defaults

        avg = db.query(func.avg(models.Job.min_salary)).scalar() or 0
        
        skills = db.query(
            models.Skill.skill_name, 
            func.count(models.job_skills.c.job_id).label("count")
        ).join(models.job_skills).group_by(models.Skill.skill_name).order_by(
            func.count(models.job_skills.c.job_id).desc()
        ).limit(10).all()
        
        trend = db.query(
            models.Job.work_year, 
            func.avg(models.Job.min_salary)
        ).filter(
            models.Job.work_year.isnot(None)
        ).group_by(models.Job.work_year).order_by(models.Job.work_year).all()
        
        w_set = db.query(
            models.Job.work_setting, 
            func.count(models.Job.job_id)
        ).filter(
            models.Job.work_setting.isnot(None)
        ).group_by(models.Job.work_setting).all()
        
        c_size = db.query(
            models.Job.company_size, 
            func.count(models.Job.job_id)
        ).filter(
            models.Job.company_size.isnot(None)
        ).group_by(models.Job.company_size).all()

        result = {
            "total_jobs": total,
            "avg_salary": int(avg),
            "top_skills": [{"name": s[0], "count": s[1]} for s in skills],
            "salary_trend": [{"year": int(s[0]), "salary": int(s[1])} for s in trend],
            "work_setting": [{"name": s[0], "count": s[1]} for s in w_set],
            "company_size": [{"name": s[0], "count": s[1]} for s in c_size]
        }
        
        print(f"✅ Returning data: {total} jobs")
        return result
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return defaults
    finally:
        db.close()

@app.get("/jobs")
def get_jobs_list(search: Optional[str] = None, limit: int = 100):
    print(f"💼 Jobs list request (limit={limit})")
    db = get_db()
    if not db:
        return []
    
    try:
        # ⭐ KEY FIX: Use joinedload to load company and skills BEFORE closing session
        q = db.query(models.Job).options(
            joinedload(models.Job.company),
            joinedload(models.Job.skills)
        )
        
        if search:
            q = q.filter(or_(
                models.Job.job_title.like(f"%{search}%"),
                models.Job.location.like(f"%{search}%")
            ))
        
        jobs = q.limit(limit).all()
        
        # Convert to dict WHILE session is still open
        result = []
        for job in jobs:
            result.append({
                "job_id": job.job_id,
                "job_title": job.job_title,
                "location": job.location,
                "min_salary": job.min_salary,
                "max_salary": job.max_salary,
                "company": {"company_name": job.company.company_name} if job.company else None,
                "work_setting": job.work_setting,
                "company_size": job.company_size,
                "experience_level": job.experience_level,
                "job_category": job.job_category,
                "work_year": job.work_year,
                "skills": [{"skill_name": s.skill_name} for s in job.skills] if job.skills else []
            })
        
        print(f"✅ Returning {len(result)} jobs")
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        db.close()

@app.post("/jobs")
def create_job(job: schemas.JobCreate):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="DB connection failed")
    try:
        company = db.query(models.Company).filter_by(company_name=job.company_name).first()
        if not company:
            company = models.Company(company_name=job.company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
        
        new_job = models.Job(
            job_title=job.job_title,
            location=job.location,
            min_salary=job.min_salary,
            max_salary=job.max_salary,
            company_id=company.company_id,
            experience_level=job.experience_level,
            work_setting=job.work_setting,
            job_category=job.job_category,
            company_size=job.company_size,
            work_year=job.work_year or 2024
        )
        
        if job.skills:
            for skill_name in job.skills:
                skill = db.query(models.Skill).filter_by(skill_name=skill_name).first()
                if not skill:
                    skill = models.Skill(skill_name=skill_name)
                    db.add(skill)
                new_job.skills.append(skill)
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        # Return as dict to avoid session issues
        result = {
            "job_id": new_job.job_id,
            "job_title": new_job.job_title,
            "location": new_job.location,
            "min_salary": new_job.min_salary,
            "max_salary": new_job.max_salary,
            "company": {"company_name": company.company_name},
            "skills": [{"skill_name": s.skill_name} for s in new_job.skills]
        }
        
        return result
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

if __name__ == "__main__":
    print("\n✅ Server starting on http://127.0.0.1:8000")
    print("📍 Docs: http://127.0.0.1:8000/docs\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)
